const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: "",
    database: "SCHOOL"
})

db.connect((err) => {
    if (err) {
        console.log("connection Error", err)
        return;
    }
    console.log("connection Establish successfully")
})
module.exports = db;