import { spawn } from 'child_process'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

function escapePsSingleQuoted(value: string): string {
  return value.replace(/'/g, "''")
}

function runPowerShell(script: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true }
    )
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else {
        const detail = (stderr || stdout).trim()
        reject(new Error(detail || `PowerShell exit ${code ?? 'unknown'}`))
      }
    })
  })
}

/** Nombre de cola Windows (p. ej. POS-80) desde nombre configurado. */
export async function resolveWindowsQueueName(configuredName: string): Promise<string> {
  const wanted = configuredName.trim()
  if (!wanted) throw new Error('Nombre de impresora vacío')

  const script = `
$target = '${escapePsSingleQuoted(wanted)}'
$p = Get-Printer -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -eq $target -or $_.ShareName -eq $target -or $_.DriverName -eq $target
} | Select-Object -First 1
if (-not $p) {
  $p = Get-Printer -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like "*$target*" -or $_.DriverName -like "*$target*"
  } | Select-Object -First 1
}
if (-not $p) { throw "Impresora no encontrada: $target" }
Write-Output $p.Name
`
  const { stdout } = await runPowerShell(script)
  const name = stdout.trim().split(/\r?\n/).pop()?.trim()
  if (!name) throw new Error(`Impresora no encontrada: ${wanted}`)
  return name
}

/** Puerto físico (USB001, COM3, etc.). */
export async function getWindowsPrinterPort(queueName: string): Promise<string | null> {
  const script = `
$p = Get-Printer -Name '${escapePsSingleQuoted(queueName)}' -ErrorAction Stop
Write-Output $p.PortName
`
  try {
    const { stdout } = await runPowerShell(script)
    const port = stdout.trim().split(/\r?\n/).pop()?.trim()
    return port || null
  } catch {
    return null
  }
}

/**
 * Envía bytes ESC/POS con WinSpool API y tipo de documento RAW.
 */
export async function sendRawBytesWinSpool(queueName: string, data: Buffer): Promise<void> {
  const file = join(tmpdir(), `pv-raw-${randomUUID()}.bin`)
  writeFileSync(file, data)

  const psFile = file.replace(/\\/g, '/')
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class PvRawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter(string pPrinter, out IntPtr h, IntPtr pd);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr h, int lvl, [In] DOCINFOA di);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h, IntPtr p, int cb, out int written);

  public static void Send(string printer, byte[] bytes) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero))
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter");
    try {
      var di = new DOCINFOA { pDocName = "PuntoVenta", pDataType = "RAW" };
      if (!StartDocPrinter(h, 1, di))
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter");
      try {
        if (!StartPagePrinter(h))
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter");
        try {
          IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
          try {
            Marshal.Copy(bytes, 0, p, bytes.Length);
            int n;
            if (!WritePrinter(h, p, bytes.Length, out n) || n != bytes.Length)
              throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter");
          } finally { Marshal.FreeCoTaskMem(p); }
        } finally { EndPagePrinter(h); }
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
$bytes = [System.IO.File]::ReadAllBytes('${psFile}')
[PvRawPrint]::Send('${escapePsSingleQuoted(queueName)}', $bytes)
`

  try {
    await runPowerShell(script)
  } finally {
    try {
      if (existsSync(file)) unlinkSync(file)
    } catch {
      /* ignorar */
    }
  }
}

/** Copia binaria directa al puerto USB/COM (sin cola GDI). */
export async function sendRawBytesToPort(portName: string, data: Buffer): Promise<void> {
  if (!portName || portName.startsWith('WSD') || portName.startsWith('IP_')) {
    throw new Error(`Puerto ${portName} no admite escritura directa`)
  }

  const file = join(tmpdir(), `pv-port-${randomUUID()}.bin`)
  writeFileSync(file, data)

  const device = portName.startsWith('\\\\.\\') ? portName : `\\\\.\\${portName}`
  const script = `
$src = '${escapePsSingleQuoted(file)}'
$dst = '${escapePsSingleQuoted(device)}'
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class PvPortWrite {
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr sec, uint disp, uint flags, IntPtr tmpl);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool WriteFile(IntPtr h, byte[] buf, uint n, out uint written, IntPtr ov);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr h);
  const uint GENERIC_WRITE = 0x40000000;
  const uint OPEN_EXISTING = 3;
  public static void Copy(string src, string dst) {
    byte[] data = File.ReadAllBytes(src);
    IntPtr h = CreateFile(dst, GENERIC_WRITE, 0, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
    if (h.ToInt64() == -1) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "CreateFile " + dst);
    try {
      uint w;
      if (!WriteFile(h, data, (uint)data.Length, out w, IntPtr.Zero) || w != data.Length)
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WriteFile");
    } finally { CloseHandle(h); }
  }
}
"@
[PvPortWrite]::Copy($src, $dst)
`

  try {
    await runPowerShell(script)
  } finally {
    try {
      if (existsSync(file)) unlinkSync(file)
    } catch {
      /* ignorar */
    }
  }
}

export async function sendRawEscPosWindows(
  configuredPrinterName: string,
  data: Buffer
): Promise<{ method: string }> {
  const queueName = await resolveWindowsQueueName(configuredPrinterName)
  const errors: string[] = []
  const port = await getWindowsPrinterPort(queueName)

  if (port) {
    try {
      await sendRawBytesToPort(port, data)
      return { method: `Puerto directo ${port} (${queueName})` }
    } catch (e) {
      errors.push(`Puerto: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  try {
    await sendRawBytesWinSpool(queueName, data)
    return { method: `RAW WinSpool (${queueName})` }
  } catch (e) {
    errors.push(`WinSpool: ${e instanceof Error ? e.message : String(e)}`)
  }

  throw new Error(
    `No se pudo enviar ESC/POS a "${queueName}"${port ? ` (${port})` : ''}. ${errors.join(' | ')}`
  )
}
