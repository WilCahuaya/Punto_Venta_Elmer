export function productToPosProduct(product) {
    return {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        categoryName: product.categoryName,
        stock: product.stock,
        size: product.size,
        color: product.color,
        costPrice: product.costPrice,
        priceRetail: product.priceRetail,
        priceWholesale: product.priceWholesale,
        priceDozen: product.priceDozen,
        planchaQty: product.planchaQty,
        pricePlancha: product.pricePlancha,
        cajonQty: product.cajonQty,
        priceCajon: product.priceCajon,
        imagePath: product.imagePath
    };
}
