const express = require("express");
const jwt = require("jsonwebtoken");
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

// Check if a user with the given username already exists
const doesExist = (username) => {
  // Filter the users array for any user with the same username
  let userswithsamename = users.filter((user) => {
    return user.username === username;
  });
  // Return true if any user with the same username is found, otherwise false
  if (userswithsamename.length > 0) {
    return true;
  } else {
    return false;
  }
};

const isValid = (username) => {
  // Regular expression: allows only letters (uppercase and lowercase) and numbers
  const usernameRegex = /^[a-zA-Z0-9]+$/;

  if (!usernameRegex.test(username)) {
    return false;
  }

  // else: valid
  return true;
};

const authenticatedUser = (username, password) => {
  let validUsers = users.filter((user) => {
    return user.username === username && user.password === password;
  });

  if (validUsers.length > 0) {
    return true;
  } else return false;
};

//only registered users can login
regd_users.post("/login", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  // Check if both username & password were provided
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Error: Please provide both username and password." });
  }

  // Authenticate user by credentials
  if (authenticatedUser(username, password)) {
    // Generate JWT Token
    let token = jwt.sign(
      {
        data: password, // this is usually not considered secure, but I'll go along with it as they showed it in the practice project
      },
      "thisisasecret",
      { expiresIn: 60 * 60 }
    );

    // Store token and username in session
    req.session.authorization = {
      token,
      username,
    };

    return res.status(200).json({ message: "Login was successful." });
  } else {
    return res
      .status(401)
      .json({ message: "Invalid Login. Check username and password." });
  }
});

// Add a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  // The isbn of the book that the review is referring to
  const isbn = req.params.isbn;

  if (!books[isbn]) {
    return res
      .status(404)
      .json({ message: `No book with the ISBN "${isbn}" found.` });
  }

  // Get review text by query
  const reviewText = req.query.review;

  // If no review provided
  if (!reviewText) {
    return res.status(400).json({ message: "Error: No review provided." });
  }

  // Get username from current session
  const username = req.session.authorization.username;

  // Preparing review object with current username from session
  const review = { username: username, review: reviewText };

  // Looping through current reviews object to determine if user has reviewed this book already
  let existingReviewId = false;
  for (const [id, review] of Object.entries(books[isbn].reviews)) {
    // Check if the current auth user posted a review already.
    if (review.username === username) {
      existingReviewId = id;
      break;
    }
  }

  // If another user posts a review on this ISBN: add as new review
  if (!existingReviewId) {
    console.log("CREATING NEW REVIEW...");
    // Adding the new review
    const reviewId = Object.keys(books[isbn].reviews).length + 1; // Generating the Id for new review
    books[isbn].reviews[reviewId] = review;

    // Return response for newly created review
    return res.status(201).json({
      message: "New review added.",
      isbn,
      reviewId,
      review,
    });
  } else {
    // if same user posts different review: update his review
    console.log("UPDATING EXISTING REVIEW...");
    // Updating existing review
    books[isbn].reviews[existingReviewId] = review;

    // Return response for updated review
    return res.status(200).json({
      message: "Existing review updated.",
      isbn,
      reviewId: existingReviewId,
      review,
    });
  }
});

regd_users.delete("/auth/review/:isbn", (req, res) => {
  // The isbn of the book that the review is referring to
  const isbn = req.params.isbn;

  if (!books[isbn]) {
    return res
      .status(404)
      .json({ message: `No book with the ISBN "${isbn}" found.` });
  }

  // Get username from current session
  const username = req.session.authorization.username;

  // Looping through current reviews object to determine if user has reviewed this book already
  let existingReviewId = false;
  for (const [id, review] of Object.entries(books[isbn].reviews)) {
    // Check if the current auth user posted a review already.
    if (review.username === username) {
      existingReviewId = id;
      break;
    }
  }

  if (!existingReviewId) {
    return res.status(404).json({ message: "No review found for this user." });
  }

  // Delete the review
  delete books[isbn].reviews[existingReviewId];

  return res.status(204).send();
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.doesExist = doesExist;
module.exports.users = users;
