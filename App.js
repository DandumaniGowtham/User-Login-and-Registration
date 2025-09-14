const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const app = express();
const PORT = 3000;

// OTP generator
function generateOTP(length = 6) {
  return Math.floor(Math.random() * 10 ** length)
    .toString()
    .padStart(length, "0");
}
// Send OTP Email
async function sendOTPEmail(toEmail, otp) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "dgowtham8374@gmail.com",  
      pass: "xudb bymm nmoz hbgk",      // Gmail App Password (not normal password)
    },
  });

  await transporter.sendMail({
    from: '"My App" <dgowtham8374@gmail.com>',
    to: toEmail,
    subject: "Your OTP for Registration",
    text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
  });
}

// MySQL Connection 
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "399393",   
  database: "Authenticate"
});

db.connect((err) => {
  if (err) {
    console.error(" Database connection failed:", err);
  } else {
    console.log(" Connected to MySQL database");
  }
});

//  Express Setup 
app.use(express.urlencoded({ extended: true })); //  Must be before routes

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "frontend")));

//  Routes 

// Home redirect
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Render login/register/dashboard pages
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", (req, res) => res.render("dashboard", { username: "Gowtham" }));

// Registration POST
let pendingUsers = {};   // Temporary storage

app.post("/register", async (req, res) => {
  const { Username, Email, Password, otp, otpStage } = req.body;

  if (otpStage === "verify") {
    // Step 2: User entered OTP
    const storedUserData = pendingUsers[Email]; // Access the stored data from the pendingUsers object

    if (storedUserData && storedUserData.otp === otp) {
      const sql = "INSERT INTO Userdata (Username, Email, Password) VALUES (?, ?, ?)";
      db.query(sql, [storedUserData.Username, storedUserData.Email, storedUserData.Password], (err, result) => {
        if (err) {
          console.error(err);
          res.render("register", { error: "Error saving user.", otpSent: false });
        } else {
          delete pendingUsers[Email];
          res.render("dashboard", { username: storedUserData.Username });
        }
      });
    } else {
      // Invalid OTP, re-render the page with the stored data
      res.render("register", {
        error: "Invalid OTP. Try again.",
        otpSent: true,
        Username: storedUserData ? storedUserData.Username : '',
        Email: storedUserData ? storedUserData.Email : '',
        Password: storedUserData ? storedUserData.Password : ''
      });
    }
  } else {
    // Step 1: Send OTP
    const otpGenerated = generateOTP();
    pendingUsers[Email] = { Username, Email, Password, otp: otpGenerated};

    try {
      await sendOTPEmail(Email, otpGenerated);
      res.render("register", {
        otpSent: true,
        Username,
        Email,
        Password,
        error: null,
      });
    } catch (err) {
      console.error(err);
      res.render("register", { error: "Failed to send OTP. Try again.", otpSent: false });
    }
  }
});


// Login POST 
app.post("/login", (req, res) => {
  const { Email, Password } = req.body;

  const sql = "SELECT * FROM Userdata WHERE Email = ? AND Password = ?";
  db.query(sql, [Email, Password], (err, results) => {
    if (err) {
      console.error(err);
      res.send(" Error occurred during login.");
    } else if (results.length > 0) {
      const username = results[0].Username;
      res.render("dashboard", { username }); // Show dashboard with dynamic username
    } else {
      res.send(" Invalid email or password. <a href='/login'>Try again</a>");
    }
  });
});

// Logout  
app.get("/logout", (req, res) => res.redirect("/login"));

//  Start Server 
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
