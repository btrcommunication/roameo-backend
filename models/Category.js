const pool = require("../config/db");

class Category {
    static async create(categoryData) {
        const { category_name, parent_id, level, image_url, display_order } = categoryData;
        const [result] = await pool.query(
            `INSERT INTO categories (category_name, parent_id, level, image_url, display_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [category_name, parent_id || null, level || 1, image_url || null, display_order || 0, 1]
        );
        return {
            id: result.insertId,
            category_name,
            parent_id: parent_id || null,
            level: level || 1,
            image_url: image_url || null,
            display_order: display_order || 0
        };
    }

    static async getAll() {
        const [rows] = await pool.query(
            `SELECT id, category_name, parent_id, level, image_url, display_order, created_at
             FROM categories 
             WHERE is_active = 1 
             ORDER BY level ASC, display_order ASC, category_name ASC`
        );
        return rows;
    }

    // Helper to build the 3-level tree using sub_divisions
    static buildTree(categories) {
        const categoryMap = new Map();
        const rootCategories = [];

        // First pass: create mapping and initialize sub_divisions array
        categories.forEach(cat => {
            categoryMap.set(cat.id, { 
                ...cat, 
                sub_divisions: [],
                // Add image_url to the response
                image_url: cat.image_url || null
            });
        });

        // Second pass: attach children to parents
        categories.forEach(cat => {
            const mappedCat = categoryMap.get(cat.id);
            if (cat.parent_id === null) {
                rootCategories.push(mappedCat);
            } else {
                const parent = categoryMap.get(cat.parent_id);
                if (parent) {
                    parent.sub_divisions.push(mappedCat);
                }
            }
        });

        return rootCategories;
    }

    static async getNewlyListed({ limit = 10 }) {
        const [rows] = await pool.query(
            `SELECT id, category_name, created_at, image_url
             FROM categories
             WHERE is_active = 1
             ORDER BY created_at DESC
             LIMIT ?`,
            [Number(limit)]
        );
        return rows;
    }

    // Add update method
    static async update(id, categoryData) {
        const { category_name, parent_id, level, image_url, display_order } = categoryData;
        const [result] = await pool.query(
            `UPDATE categories 
             SET category_name = ?, parent_id = ?, level = ?, image_url = ?, display_order = ?
             WHERE id = ?`,
            [category_name, parent_id || null, level || 1, image_url || null, display_order || 0, id]
        );
        return result.affectedRows > 0;
    }

    // Add delete method (soft delete)
    static async delete(id) {
        const [result] = await pool.query(
            `UPDATE categories SET is_active = 0 WHERE id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // Get category by ID
    static async getById(id) {
        const [rows] = await pool.query(
            `SELECT id, category_name, parent_id, level, image_url, display_order
             FROM categories
             WHERE id = ? AND is_active = 1`,
            [id]
        );
        return rows[0] || null;
    }
}

module.exports = Category;