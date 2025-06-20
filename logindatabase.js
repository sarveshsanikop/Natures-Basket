const mysql = require('mysql');

// Establish a connection to the MySQL server
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "" // Add your MySQL root password here if applicable
});

con.connect((err) => {
    if (err) throw err;
    console.log("Database connected!");

    // Create the database if it doesn't exist
    con.query('CREATE DATABASE IF NOT EXISTS organic_farm', (err, result) => {
        if (err) throw err;
        console.log("Database 'organic_farm' created or already exists!");

        // Switch to the 'organic_farm' database
        con.changeUser({ database: 'organic_farm' }, (err) => {
            if (err) throw err;

            // Create 'users' table
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL
                )
            `;
            con.query(createUsersTable, (err, result) => {
                if (err) throw err;
                console.log("Users table created or already exists!");
            });

            // Create 'farmers' table
            const createFarmersTable = `
                CREATE TABLE IF NOT EXISTS farmers (
                    farmer_id INT AUTO_INCREMENT PRIMARY KEY,
                    farmer_name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    phone_number VARCHAR(15),
                    address TEXT,
                    farm_location VARCHAR(255),
                    password VARCHAR(255) NOT NULL,
                    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            con.query(createFarmersTable, (err, result) => {
                if (err) throw err;
                console.log("Farmers table created or already exists!");
            });

            // Create 'products' table with a foreign key reference to 'farmers'
            const createProductsTable = `
                CREATE TABLE IF NOT EXISTS products (
                    product_id INT AUTO_INCREMENT PRIMARY KEY,
                    product_name VARCHAR(100) NOT NULL,
                    description TEXT,
                    category VARCHAR(50) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    quantity INT NOT NULL,
                    image_url VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    farmer_id INT,
                    FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE SET NULL
                )
            `;
            con.query(createProductsTable, (err, result) => {
                if (err) throw err;
                console.log("Products table created or already exists!");
            });

            // Create 'cart' table
            const createCartTable = `
                CREATE TABLE IF NOT EXISTS cart (
                    cart_id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    product_id INT,
                    quantity INT DEFAULT 1,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
                )
            `;
            con.query(createCartTable, (err, result) => {
                if (err) throw err;
                console.log("Cart table created or already exists!");
            });

            // Remove the 'user_id' column from 'cart' table
            const dropForeignKeyConstraint = `
                ALTER TABLE cart
                DROP FOREIGN KEY cart_ibfk_1;  
            `;
            con.query(dropForeignKeyConstraint, (err, result) => {
                if (err) throw err;
                console.log("Foreign key constraint dropped from cart table!");

                const dropUserIdColumn = `
                    ALTER TABLE cart
                    DROP COLUMN user_id;
                `;
                con.query(dropUserIdColumn, (err, result) => {
                    if (err) throw err;
                    console.log("user_id column removed from cart table!");
                });
            });
        });
    });
});

module.exports = con;
