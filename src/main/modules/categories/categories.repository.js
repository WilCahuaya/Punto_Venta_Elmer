export function listCategories(db, filters) {
    const conditions = [];
    const params = [];
    if (!filters.includeInactive) {
        conditions.push('c.is_active = 1');
    }
    if (filters.search?.trim()) {
        conditions.push('(c.name LIKE ? OR c.description LIKE ?)');
        const q = `%${filters.search.trim()}%`;
        params.push(q, q);
    }
    if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
            conditions.push('c.parent_id IS NULL');
        }
        else {
            conditions.push('c.parent_id = ?');
            params.push(filters.parentId);
        }
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
        .prepare(`SELECT c.id, c.parent_id, p.name AS parent_name, c.name, c.description,
              c.is_active, c.sort_order, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_active = 1) AS product_count,
              (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id AND sc.is_active = 1) AS subcategory_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ${where}
       ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.sort_order ASC, c.name ASC`)
        .all(...params);
}
export function getCategoryById(db, id) {
    return db
        .prepare(`SELECT c.id, c.parent_id, p.name AS parent_name, c.name, c.description,
              c.is_active, c.sort_order, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_active = 1) AS product_count,
              (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id AND sc.is_active = 1) AS subcategory_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.id = ?`)
        .get(id);
}
export function getCategoryByNameAndParent(db, name, parentId, excludeId) {
    const parentKey = parentId ?? 0;
    if (excludeId) {
        return db
            .prepare('SELECT id FROM categories WHERE name = ? AND COALESCE(parent_id, 0) = ? AND id != ?')
            .get(name, parentKey, excludeId);
    }
    return db
        .prepare('SELECT id FROM categories WHERE name = ? AND COALESCE(parent_id, 0) = ?')
        .get(name, parentKey);
}
export function insertCategory(db, data) {
    const result = db
        .prepare(`INSERT INTO categories (parent_id, name, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?)`)
        .run(data.parentId, data.name, data.description, data.sortOrder, data.isActive);
    return Number(result.lastInsertRowid);
}
export function updateCategory(db, id, data) {
    db.prepare(`UPDATE categories SET parent_id = ?, name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`).run(data.parentId, data.name, data.description, data.sortOrder, data.isActive, id);
}
export function softDeleteCategory(db, id) {
    db.prepare(`UPDATE categories SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
}
export function countProductsInCategory(db, categoryId) {
    const row = db
        .prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ? AND is_active = 1')
        .get(categoryId);
    return row.c;
}
export function countAllProductsInCategory(db, categoryId) {
    const row = db
        .prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?')
        .get(categoryId);
    return row.c;
}
export function countAllSubcategories(db, parentId) {
    const row = db
        .prepare('SELECT COUNT(*) AS c FROM categories WHERE parent_id = ?')
        .get(parentId);
    return row.c;
}
export function hardDeleteCategory(db, id) {
    const result = db
        .prepare('DELETE FROM categories WHERE id = ? AND is_active = 0')
        .run(id);
    return result.changes > 0;
}
export function countActiveSubcategories(db, parentId) {
    const row = db
        .prepare('SELECT COUNT(*) AS c FROM categories WHERE parent_id = ? AND is_active = 1')
        .get(parentId);
    return row.c;
}
export function listParentCategories(db) {
    return listCategories(db, { includeInactive: false, parentId: null });
}
