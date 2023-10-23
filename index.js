const express = require('express')
const db = require('./connection')
const xlsx = require('xlsx')

const fileUpload = require('express-fileupload')
const bcrypt = require('bcrypt')
const path = require('path')
const fs = require('fs')
const port = process.env.PORT || 5000;

const app = express();

const store = path.join(__dirname, '/Public/images')
app.use(express.json());
//image browser
app.use(express.static(store))
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: 'Public/'
}))

//http://localhost:5000/school/admission
app.route('/school/admission/:id?')
    .get((req, res) => {
        const { id } = req.params || {}
        let mysql = id ? (`SELECT * FROM admission WHERE id=${id}`) : 'SELECT * FROM admission';

        db.query(mysql, (err, result) => {
            if (err) { console.log("ERROR", err) }
            res.send(result);
        })

    })
    .post((req, res) => {
        const { stu_name, stu_course, stu_fee, stu_phone } = req.body || {};

        const db_row = {
            stu_name: stu_name,
            stu_course: stu_course,
            stu_phone: stu_phone,
            stu_fee: stu_fee,
            stu_profile: '',
            date: new Date()
        }
        let mysql = `INSERT INTO admission SET ?`;
        db.query(mysql, db_row, (err, result) => {
            if (err) { console.log("ERROR", err) }
            //file upload 
            const extension = req.files?.profile.mimetype?.split('/')
            //split method works as convert into string TO array
            const profileImgName = `profile_${result.insertId}.${extension?.at(1)}`
            req.files.profile.mv(`${store}/${profileImgName}`)
            //insert image
            const profile_img = {
                stu_profile: `http://localhost:5000/${profileImgName}`,
            }

            db.query(`UPDATE admission SET ? WHERE id=${result.insertId}`, profile_img, (err, result) => {
                if (err) { console.log("ERROR", err) }
                res.send(result);
            })

        })
    })
    .patch((req, res) => {
        const { id } = req.body || {};
        // console.log("first", req.files)
        const finduser = `SELECT * FROM admission WHERE id=${id}`

        db.query(finduser, (err, result) => {
            console.log('second',)
            if (err) {
                console.log("err", err);
            }
            let profile = { ...req.body }
            if (req.files?.profile) {
                const { stu_profile } = result?.at(0);
                const extension = req.files?.profile.mimetype?.split('/')
                const profileImgName = `profile_${id}.${extension?.at(1)}`
                const oldImg = stu_profile?.split('/')?.slice(-1)
                //fs.unlinkSync(`${store}/${oldImg}`);
                fs.unlink(`${store}/${oldImg}`, () => {
                    req.files.profile.mv(`${store}/${profileImgName}`)
                });
                profile.stu_profile = `http://localhost:5000/${profileImgName}`
            }

            //insert image

            db.query(`UPDATE admission SET ? WHERE id=${id}`, profile, (err, result) => {
                if (err) { console.log("ERROR", err) }
                res.send(result);
            })
        })

    })
    .delete((req, res) => {
        const { id } = req.params;
        let mysql = `DELETE FROM admission WHERE id=${id} `;
        db.query(mysql, (err, result) => {
            if (err) { console.log("ERROR", err) }
            res.send(result);
        })
    })

//http://localhost:5000/fetch-students
app.post('/fetch-students/:id?', (req, res) => {
    const { id } = req.params;
    let sql = id ? `SELECT * FROM studentsMarks WHERE id=${id}` : "SELECT * FROM studentsMarks";
    db.query(sql, (err, results) => {
        if (err) { return console.log(first) }
        return res.json({ results })
    })
})

//http://localhost:5000/upload-excel
app.post('/upload-excel', (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.file?.tempFilePath;
    const workbook = xlsx.readFile(file)
    const sheetName = workbook?.SheetNames?.at(0)

    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // ------------------------insert to database---------------
    const sql = 'INSERT INTO studentsMarks SET ?'
    sheetData.forEach(row => {
        db.query(sql, row, (err, result) => {
            if (err) { console.log(err) }
            // console.log(result)
        })
    })
    res.json(sheetData);
})

//http://localhost:5000/download-sheet
app.get("/download-sheet", (req, res) => {
    const sql = "SELECT * FROM studentsMarks"
    db.query(sql, (err, result) => {
        if (err) { console.log("error", err) }

        // Create a new workbook and worksheet
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(result)
        // Add the worksheet to the workbook
        const name = xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
        // Generate Excel file buffer
        const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

        //Binary string
        xlsx.write(wb, { bookType: 'xlsx', type: 'binary' })
        xlsx.writeFile(wb, "Sheet1.xlsx")
        res.send({ msg: "file download succefully" })

    })
})

//-----------------------------LOGIN /SIGNUP------------------------------

//http://localhost:5000/all-user
app.get('/all-user', (req, res) => {
    const sql = `SELECT * FROM users`
    db.query(sql, (error, results) => error ? console.log(error) : res.send(results))
})

//http://localhost:5000/signUp

app.post('/signUp', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    //check password
    if (password !== confirmPassword) {
        return res.status(404).send({ error: "password must be match" })
    }
    //check email
    const mailCheck = 'SELECT email FROM users '
    db.query(mailCheck, (err, result) => {
        const checkMail = result?.some(data => data.email === email)

        if (checkMail === true) {
            console.log("$$$$", result)
            return res.send({ msg: "this email already exist" })
        }
        // else {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).send({ error: 'Internal server error' })
            }
            const sql = `INSERT INTO users SET ?`
            const signupData = {
                username: user?.userName,
                password: hash,
                email: email,
                date: new Date()
            };
            // console.log("data", signupData)
            db.query(sql, signupData, (err, result) => {
                if (err) {
                    return res.send({ err })
                }
                else {
                    return res.send({ msg: "you are the member", result })
                }
            })
        })
        // }
    })

})

//http://localhost:5000/login

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email= ?`;
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).send({ message: 'Internal Serv', err });
        }
        // console.log("######",results)
        const user = results[0];
        bcrypt.compare(password, user.password, (err, decodepwd) => {
            console.log("decod>>>>", err, decodepwd)
            if (err) {
                return res.status(500).send({ message: 'Internal Server Error' });
            }
            if (decodepwd == true) {
                return res.send({
                    message: 'Login successful',
                    userDetail: [
                        {
                            id: user?.id,
                            username: user?.userName,
                            email: user?.email,
                            date: user?.date,
                        },
                    ]
                });
            } else {
                return res.status(401).send({ message: 'Invalid credentials' });
            }
        });
    });
});



app.listen(port, (req, res) => { console.log("Run on 5000 port ") })