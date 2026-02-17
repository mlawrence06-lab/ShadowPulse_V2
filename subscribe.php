<?php
// subscribe.php
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid email address.']);
        exit;
    }

    // Database Credentials
    $servername = "localhost";
    $username = "wp_user";
    $password = "StrongPress_Pass99!";
    $dbname = "wp_db";

    // Create connection
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        // Log error internally, show generic message
        error_log("Connection failed: " . $conn->connect_error);
        echo json_encode(['status' => 'error', 'message' => 'Server error. Please try again later.']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO wp_waitlist (email) VALUES (?)");
    $stmt->bind_param("s", $email);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'You have been added to the waiting list!']);
    } else {
        if ($conn->errno == 1062) { // Duplicate entry
            echo json_encode(['status' => 'success', 'message' => 'You are already on the list!']);
        } else {
            error_log("Db Error: " . $stmt->error);
            echo json_encode(['status' => 'error', 'message' => 'Could not save email.']);
        }
    }

    $stmt->close();
    $conn->close();
}
?>