const express = require('express');
const app = express();
//http://localhost:5000/signUp

app.post('/signUp', (req, res) => {
    res.send("i am signUp")
    // const { userName, password } = req.body;
})