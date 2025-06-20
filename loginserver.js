const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");  // Session handling middleware

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(session({
    secret: 'your-secret-key',  // Secret for session encryption
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true in production with HTTPS
}));

// Database connection
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "organic_farm"
});

con.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL database!");
});

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Login Endpoint for Users
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM users WHERE email = ? AND password = ?";

    con.query(query, [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            res.redirect("/dashboard");
        } else {
            res.send(`
                <h2>Invalid email or password!</h2>
                <a href="/">Go back to Login</a>
            `);
        }
    });
});

// Login Endpoint for Farmers
app.post("/selllogin", (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM farmers WHERE email = ? AND password = ?";

    con.query(query, [email, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            // Set the farmer ID in the session
            req.session.farmerId = results[0].farmer_id;
            res.redirect("/farmerdashboard");
        } else {
            res.send(`
                <h2>Invalid email or password for Farmer Login!</h2>
                <a href="/">Go back to Login</a>
            `);
        }
    });
});

// Signup Endpoint for Users
app.post("/signup", (req, res) => {
    const { user_name, email, password } = req.body;

    const checkQuery = "SELECT * FROM users WHERE email = ?";
    con.query(checkQuery, [email], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            res.send(`
                <h2>User already exists with this email!</h2>
                <a href="/signup">Go back to Sign Up</a>
            `);
        } else {
            const insertQuery = "INSERT INTO users (user_name, email, password) VALUES (?, ?, ?)";
            con.query(insertQuery, [user_name, email, password], (err, result) => {
                if (err) throw err;
                res.send(`
                    <h2>Account created successfully!</h2>
                    <a href="/">Go to Login</a>
                `);
            });
        }
    });
});

// Signup Endpoint for Farmers
app.post("/sellsignup", (req, res) => {
    const { farmer_name, email, phone_number, address, farm_location, password } = req.body;

    const checkQuery = "SELECT * FROM farmers WHERE email = ?";
    con.query(checkQuery, [email], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            res.send(`
                <h2>Farmer already exists with this email!</h2>
                <a href="/register">Go back to Registration</a>
            `);
        } else {
            const insertQuery = `
                INSERT INTO farmers (farmer_name, email, phone_number, address, farm_location, password)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            con.query(insertQuery, [farmer_name, email, phone_number, address, farm_location, password], (err, result) => {
                if (err) throw err;
                res.send(`
                    <h2>Registration successful!</h2>
                    <a href="/">Go to Login</a>
                `);
            });
        }
    });
});

// Add Product Route (for Farmers)
app.post('/addProduct', (req, res) => {
    const { product_name, description, category, price, quantity, image_url } = req.body;
    const farmer_id = req.session.farmerId;  // Get farmer_id from session

    console.log("Farmer ID from session:", farmer_id);  // Log farmer_id to check if it's available

    if (!farmer_id) {
        return res.status(403).json({ success: false, message: 'User not logged in' });
    }

    const insertQuery = `
        INSERT INTO products (product_name, description, category, price, quantity, image_url, farmer_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    con.query(insertQuery, [product_name, description, category, price, quantity, image_url, farmer_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Error adding product' });
        }
        res.status(200).json({ success: true, message: 'Product added successfully' });
    });
});

app.get('/myProducts', (req, res) => {
    const farmer_id = req.session.farmerId;

    if (!farmer_id) {
        return res.redirect('/selllogin.html'); // Redirect to login if not logged in
    }

    const query = "SELECT * FROM products WHERE farmer_id = ?";

    con.query(query, [farmer_id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error retrieving products' });
        }

        // Send the products in JSON format to the frontend
        res.json(results);
    });
});

app.get('/products', (req, res) => {
    // Get query parameters
    const searchQuery = req.query.searchQuery || '';  // Default to empty string if no search query
    const category = req.query.category || '';        // Default to empty string if no category
    const price = req.query.price || '';              // Default to empty string if no price filter

    // Start building the SQL query
    let query = `
        SELECT product_id, product_name, description, category, price, quantity, image_url, created_at
        FROM products
        WHERE 1=1
    `;

    // Add search condition if a search query is provided
    if (searchQuery) {
        query += ` AND (product_name LIKE ? OR description LIKE ?)`;  // Fixed the query with LIKE conditions
    }

    // Add category filter if a category is provided
    if (category) {
        query += ` AND category = ?`;
    }

    // Add sorting based on price if provided
    if (price === 'low') {
        query += ` ORDER BY price ASC`;
    } else if (price === 'high') {
        query += ` ORDER BY price DESC`;
    }

    // Prepare parameters for the query (based on dynamic conditions)
    const queryParams = [];
    if (searchQuery) {
        queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }
    if (category) {
        queryParams.push(category);
    }

    // Execute the query
    con.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).send({ message: 'Error fetching products' });
        }
        res.json(results);
    });
});

// Endpoint to update product quantity
app.post('/update-quantity', (req, res) => {
    const { productId, quantity } = req.body; // Accept both productId and quantity

    if (!productId || !quantity) {
        return res.status(400).send({ message: 'Product ID and quantity are required' });
    }

    // Check if the product exists and has sufficient stock
    const checkProductQuery = `SELECT quantity FROM products WHERE product_id = ? AND quantity > 0`;

    con.query(checkProductQuery, [productId], (err, result) => {
        if (err) {
            console.error('Error checking product availability:', err);
            return res.status(500).send({ message: 'Error checking product availability' });
        }

        if (result.length === 0 || result[0].quantity < quantity) {
            return res.status(400).send({ message: 'Not enough stock for this product' });
        }

        // Insert the product into the cart (cart table) if enough stock exists
        const insertCartQuery = `
            INSERT INTO cart (product_id, quantity)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + ?;
        `;

        con.query(insertCartQuery, [productId, quantity, quantity], (err, result) => {
            if (err) {
                console.error('Error adding product to cart:', err);
                return res.status(500).send({ message: 'Error adding product to cart' });
            }

            // Update the product quantity in the products table (decrease by quantity added)
            const updateProductQuery = `
                UPDATE products
                SET quantity = quantity - ?
                WHERE product_id = ?
            `;

            con.query(updateProductQuery, [quantity, productId], (err, result) => {
                if (err) {
                    console.error('Error updating product quantity:', err);
                    return res.status(500).send({ message: 'Error updating product quantity' });
                }

                res.send({ success: true, message: 'Product added to cart and quantity updated!' });
            });
        });
    });
});
app.get('/get-cart', (req, res) => {
    // Fetch the cart items from the cart table and join with the products table
    const query = `
        SELECT p.product_id, p.product_name, p.price, c.quantity
        FROM cart c
        JOIN products p ON c.product_id = p.product_id
    `;

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching cart data:', err);
            return res.status(500).send({ message: 'Error fetching cart data' });
        }

        res.send({ cart: results });
    });
});

// Remove a product from the cart
app.post('/remove-from-cart', (req, res) => {
    const { productId } = req.body;
    const removeFromCartQuery = `DELETE FROM cart WHERE product_id = ?`;

    con.query(removeFromCartQuery, [productId], (err, result) => {
        if (err) {
            console.error('Error removing product from cart:', err);
            return res.status(500).json({ success: false, message: 'Failed to remove product' });
        }
        res.json({ success: true });
    });
});




// Farmer Dashboard
app.get('/farmerdashboard', (req, res) => {
    if (!req.session.farmerId) {
        return res.redirect('/');  // Redirect to login if not logged in
    }
    res.sendFile(path.join(__dirname, 'public/farmerdashboard.html'));
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
});

// Dashboard page for regular users
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
