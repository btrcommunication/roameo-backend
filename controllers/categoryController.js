const Category = require("../models/Category");
const fs = require('fs');
const path = require('path');

// Helper function to save base64 image
const saveBase64Image = async (base64Data, categoryName) => {
  try {
    // Remove the data:image/*;base64, prefix if present
    const base64String = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;
    
    // Determine file extension
    let extension = 'jpg';
    if (base64Data.includes('data:image/png')) extension = 'png';
    else if (base64Data.includes('data:image/gif')) extension = 'gif';
    else if (base64Data.includes('data:image/webp')) extension = 'webp';
    
    // Create filename
    const filename = `category-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
    const uploadDir = path.join(__dirname, '../uploads/categories');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filepath = path.join(uploadDir, filename);
    
    // Save the file
    const buffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    // Return the URL
    const baseUrl = process.env.BASE_URL || 'https://roameomobileapp.braventra.in';
    return `${baseUrl}/uploads/categories/${filename}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
};

// ─────────────────────────────────────────────
// GET /api/categories
// Get all categories in a nested tree view
// ─────────────────────────────────────────────
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.getAll();
        const tree = Category.buildTree(categories);

        return res.status(200).json({
            status: "success",
            message: "Categories retrieved successfully",
            data: tree
        });
    } catch (err) {
        console.error("Get Categories Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch categories due to a database error."
        });
    }
};

// ─────────────────────────────────────────────
// GET /api/categories/newly-listed
// Get newly listed categories
// ─────────────────────────────────────────────
exports.getNewlyListedCategories = async (req, res) => {
    try {
        const limit = req.query.limit || 10;
        const newlyListed = await Category.getNewlyListed({ limit });

        return res.status(200).json({
            status: "success",
            message: "Newly listed categories retrieved",
            data: newlyListed
        });
    } catch (err) {
        console.error("Get Newly Listed Categories Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Could not load newly listed categories."
        });
    }
};

// ─────────────────────────────────────────────
// POST /api/categories
// Create a new category
// ─────────────────────────────────────────────
exports.createCategory = async (req, res) => {
    try {
        const { category_name, parent_id, level, image_url, image_base64, display_order } = req.body;
        
        if (!category_name || category_name.trim() === '') {
            return res.status(400).json({
                status: "error",
                message: "Category name is required"
            });
        }

        let finalImageUrl = image_url || null;
        
        // If base64 image is provided, save it
        if (image_base64) {
            const savedImageUrl = await saveBase64Image(image_base64, category_name);
            if (savedImageUrl) {
                finalImageUrl = savedImageUrl;
            }
        }

        const categoryData = {
            category_name: category_name.trim(),
            parent_id: parent_id || null,
            level: level || 1,
            image_url: finalImageUrl,
            display_order: display_order || 0
        };

        const newCategory = await Category.create(categoryData);

        return res.status(201).json({
            status: "success",
            message: "Category created successfully",
            data: newCategory
        });
    } catch (err) {
        console.error("Create Category Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to create category due to a database error."
        });
    }
};

// ─────────────────────────────────────────────
// PUT /api/categories/:id
// Update a category
// ─────────────────────────────────────────────
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name, parent_id, level, image_url, image_base64, display_order } = req.body;

        if (!category_name || category_name.trim() === '') {
            return res.status(400).json({
                status: "error",
                message: "Category name is required"
            });
        }

        const categoryExists = await Category.getById(id);
        if (!categoryExists) {
            return res.status(404).json({
                status: "error",
                message: "Category not found"
            });
        }

        let finalImageUrl = image_url || categoryExists.image_url;
        
        // If new base64 image is provided, save it
        if (image_base64) {
            const savedImageUrl = await saveBase64Image(image_base64, category_name);
            if (savedImageUrl) {
                finalImageUrl = savedImageUrl;
            }
        }

        const categoryData = {
            category_name: category_name.trim(),
            parent_id: parent_id || null,
            level: level || 1,
            image_url: finalImageUrl,
            display_order: display_order || 0
        };

        const updated = await Category.update(id, categoryData);

        if (updated) {
            const updatedCategory = await Category.getById(id);
            return res.status(200).json({
                status: "success",
                message: "Category updated successfully",
                data: updatedCategory
            });
        } else {
            return res.status(500).json({
                status: "error",
                message: "Failed to update category"
            });
        }
    } catch (err) {
        console.error("Update Category Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to update category due to a database error."
        });
    }
};

// ─────────────────────────────────────────────
// DELETE /api/categories/:id
// Delete a category (soft delete)
// ─────────────────────────────────────────────
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const categoryExists = await Category.getById(id);
        if (!categoryExists) {
            return res.status(404).json({
                status: "error",
                message: "Category not found"
            });
        }

        const deleted = await Category.delete(id);

        if (deleted) {
            return res.status(200).json({
                status: "success",
                message: "Category deleted successfully"
            });
        } else {
            return res.status(500).json({
                status: "error",
                message: "Failed to delete category"
            });
        }
    } catch (err) {
        console.error("Delete Category Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Failed to delete category due to a database error."
        });
    }
};