const Category = require("../models/Category");

class CategoryService {
    static async getCategoryTree() {
        const categories = await Category.getAll();
        return Category.buildTree(categories);
    }
}

module.exports = CategoryService;
