const http = require('http');
const express = require('express');
const requestIp = require('request-ip');
const cors = require('cors'); // Import the cors package

const socketIo = require('socket.io');
const mysql = require('mysql');

const app = express();
const server = http.createServer(app);
const bodyParser = require('body-parser');

const io = socketIo(server, {
  cors: {
    origin: '*', // Replace with your React app's URL
    methods: ['GET', 'POST'],
  },
});

// Create a MySQL database connection
const db = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'test'
});

// Connect to the database
db.connect((err) => {
	if (err) {
		console.error('Database connection failed: ' + err.message);
	}
});


app.use(cors());
app.use(bodyParser.json());



// app.use(requestIp.mw());
// app.get('/getIP', (req, res) => {
//     const clientIp = req.clientIp;

//     // Now you can use the clientIp variable, which contains the public IP address of the client
//     res.json({ ip: clientIp });
// });



// Endpoint to get existing visitors
app.get('/get-visitor-data', (req, res) => {
  // Fetch data from the "customers" table
  const query = 'SELECT * FROM customers WHERE is_online = "yes" AND name=""';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);

    }
  });
});


app.get('/get-chat-data', (req, res) => {
  // Fetch data from the "customers" table
  const query = 'SELECT * FROM customers WHERE name!="" ORDER BY id DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);

    }
  });
});


// API endpoint to get customer IDs
app.get('/api/customers', (req, res) => {
  db.query('SELECT * FROM customers', (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});



app.put('/update-conversation', (req, res) => {
  const { status, room, customer_id } = req.body;

  // Update the conversation record in the MySQL table
  const updateSql = 'UPDATE conversations SET status = ? WHERE room = ? AND customer_id = ?';
  db.query(updateSql, [status, room, customer_id], (updateErr, updateResult) => {
    if (updateErr) {
      console.error('Error updating conversation in MySQL:', updateErr);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      console.log('Conversation updated successfully');
      res.json({ success: true });
    }
  });
});


app.get('/api/messages/:room_id', (req, res) => {
  const room_id = req.params.room_id;

  // Fetch data from tbl_msg table
  db.query('SELECT * FROM tbl_msg WHERE (room_id = ? AND to_room = ?) OR (to_room = ? AND room_id = ?)', ["admin_room", room_id, "admin_room", room_id], (err, messages) => {
    if (err) {
      console.error('Error executing MySQL query for messages:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    // Fetch data from customers table
    db.query('SELECT * FROM customers WHERE room = ?', [room_id], (err, customers) => {
      if (err) {
        console.error('Error executing MySQL query for customers:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Combine results and send the response
      const data = {
        messages: messages,
        customers: customers
      };


      res.json(data);
    });
  });
});




app.post('/save_details', (req, res) => {
  // Extract data from the request body
  const { name, email, phone, notes, room } = req.body;

        const sql = 'UPDATE customers SET name=?,email=?,phone=?,notes=? WHERE room=?';
        db.query(sql, [name,email,phone,notes,room], (err, result) => {
            if (err) {
                console.error('Database insert error: ' + err.message);
                return;
            }

            res.status(200).json({ message: 'Data received successfully' });
 
        });
  
});





// Handle GET request to /api/conversations
app.get('/api/conversations', (req, res) => {
    const { customerId,roomId } = req.query;

    // Use a prepared statement to avoid SQL injection
    const query = 'SELECT * FROM conversations WHERE customer_id = ? AND room!= ?';

    // Execute the query
    db.query(query, [customerId,roomId], (err, results) => {
        if (err) {
            console.error('Error fetching conversations from MySQL:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            // Send the list of conversations as JSON
            res.json(results);
        }
    });
});



// Function to display all messages for a specific room on page load (for user)
function displayRoomMessages(socket, roomId) {
	const sql = 'SELECT msg,room_id FROM tbl_msg WHERE (room_id = ? AND to_room = ?) OR (to_room = ? AND room_id = ?)';

	db.query(sql, ['admin_room', roomId, 'admin_room', roomId], (err, results) => { 
		if (err) {
			console.error('Database select error: ' + err.message);
			return;
		}

		const messages = results.map((row) => ({ room_id: row.room_id, msg: row.msg }));
		socket.emit('room messages', messages);
	});
}



//Fetch Users from database on page load (admin)
function fetchUsers(socket) {
	const sql = 'SELECT * FROM customers WHERE id!=?';
	db.query(sql,[0],(err, results) => {
		if (err) {
			console.error('Database select error: ' + err.message);
			return;
		}

		const customers = results.map((row) => ({
			room_id: row.room,
			name: row.name,
			is_online: row.is_online,
		}));

		io.to("admin_room").emit('fetch_users', customers);
	});
}



const userRooms = {}; // Object to store the rooms each user is connected to
io.on('connection', (socket) => {

	socket.on('join', (roomId,pageurl,userAgent) => {
		socket.join(roomId);
		console.log(`User joined room: ${roomId}`);

    // Store the room that the user is connected to
    userRooms[socket.id] = roomId;

    // Update the 'is_online' column in the 'customers' table
    const updateSql = 'UPDATE customers SET viewing = ?,is_online = ? WHERE room = ?';
    db.query(updateSql, [pageurl,'yes', roomId], (updateErr, updateResult) => {
    	if (updateErr) {
    		console.error('Database update error: ' + updateErr.message);
    		return;
    	}

        // Emit new_user event to the admin room
        io.to("admin_room").emit('new_user', { room: roomId,viewing:pageurl,user_agent:userAgent });

        displayRoomMessages(socket, roomId); // Display all messages in the room to user
        fetchUsers(socket); 
    });
});




	socket.on('insert_customer', (data) => {
    const { roomId, fullName, email, public_ip, location, browser, platform, hostname, user_agent } = data;

    console.log(data);

    // Check if customer with the given email already exists
    const emailCheckSql = 'SELECT * FROM customers WHERE email = ?';
    db.query(emailCheckSql, [email], (emailCheckErr, emailCheckResult) => {
        if (emailCheckErr) {
            console.error('Database select error: ' + emailCheckErr.message);
            return;
        }

        if (emailCheckResult.length > 0) {
            // Customer with the given email already exists, update the room column
            const { id, room, name } = emailCheckResult[0];

            // Update the room column with the new roomId
            const updateSql = 'UPDATE customers SET room = ?,name = ? WHERE email = ?';
            db.query(updateSql, [roomId,fullName, email], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error('Database update error: ' + updateErr.message);
                    return;
                }

                io.to("admin_room").emit('existing_user', { room_id: roomId, fullName: name });

                // Insert a new record into the conversations table
                const conversationInsertSql = 'INSERT INTO conversations (customer_id, room) VALUES (?, ?)';
                db.query(conversationInsertSql, [id, roomId], (convInsertErr, convInsertResult) => {
                    if (convInsertErr) {
                        console.error('Conversations table insert error: ' + convInsertErr.message);
                        return;
                    }
                });
            });
            io.to('admin_room').emit('new_chat_user', { roomId });
            io.to(roomId).emit('new_chat_user', { roomId });

        } else {
            // Customer with the given email does not exist, check if customer with room exists
            const roomCheckSql = 'SELECT * FROM customers WHERE room = ?';
            db.query(roomCheckSql, [roomId], (roomCheckErr, roomCheckResult) => {
                if (roomCheckErr) {
                    console.error('Database select error: ' + roomCheckErr.message);
                    return;
                }

                if (roomCheckResult.length > 0) {
                    console.log("User found");
                    // Customer with the given room already exists
                    const { id, name, user_email } = roomCheckResult[0];

                    // Update the customer's information based on certain conditions
                    if (email == '') {
                        const updateSql = 'UPDATE customers SET name = ? WHERE room = ?';
                        db.query(updateSql, [fullName, roomId], (updateErr, updateResult) => {
                            if (updateErr) {
                                console.error('Database update error: ' + updateErr.message);
                                return;
                            }
                        });
                    } else {
                        const updateSql = 'UPDATE customers SET name = ?, email = ? WHERE room = ?';
                        db.query(updateSql, [fullName, email, roomId], (updateErr, updateResult) => {
                            if (updateErr) {
                                console.error('Database update error: ' + updateErr.message);
                                return;
                            }
                        });
                    }

                    io.to(roomId).emit('new_chat_user', { roomId });
                    io.to('admin_room').emit('new_chat_user', { roomId });
                } else {
                    // Customer with the given room does not exist, insert a new customer
                    const insertSql = 'INSERT INTO customers (name, email, room, public_ip, location, browser, platform, hostname, user_agent, is_online) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    db.query(insertSql, [fullName, email, roomId, public_ip, location, browser, platform, hostname, user_agent, 'yes'], (insertErr, insertResult) => {
                        if (insertErr) {
                            console.error('Database insert error: ' + insertErr.message);
                            return;
                        }

                        // Emit the data
                        // io.to("admin_room").emit('new_user', { room_id: roomId, fullName: fullName });

                        // Insert a new record into the conversations table
                        const lastInsertedId = insertResult.insertId;
                        const conversationInsertSql = 'INSERT INTO conversations (customer_id, room) VALUES (?, ?)';
                        db.query(conversationInsertSql, [lastInsertedId, roomId], (convInsertErr, convInsertResult) => {
                            if (convInsertErr) {
                                console.error('Conversations table insert error: ' + convInsertErr.message);
                                return;
                            }
                        });
                    });
                }
            });
        }
    });
});








    //Function to store user message into database table
    socket.on('chat message', (data) => {
    	const { roomId, message } = data;
        // Insert the message into the database
        const sql = 'INSERT INTO tbl_msg (msg, room_id, to_room) VALUES (?, ?, ?)';
        db.query(sql, [message, roomId, "admin_room"], (err, result) => {
        	if (err) {
        		console.error('Database insert error: ' + err.message);
        		return;
        	}

            // Emit the message to user itself
            io.to(roomId).emit('chat message', message);
            // Emit message to admin as well
            io.to('admin_room').emit('chat message', { room_id: roomId, msg: message }); 
        });
    });



    socket.on('admin message', (data) => {
    	const { roomId, message } = data;
        // Insert the message into the database
        const sql = 'INSERT INTO tbl_msg (msg, room_id, to_room) VALUES (?, ?, ?)';
        db.query(sql, [message, "admin_room", roomId], (err, result) => {
        	if (err) {
        		console.error('Database insert error: ' + err.message);
        		return;
        	}

            // Emit the message to user itself
            io.to(roomId).emit('admin message', message);
            // Emit message to admin as well
            io.to('admin_room').emit('admin message', { room_id: "admin_room", msg: message }); 
        });
    });



    //Function to fetch user msgs and show in admin panel
    socket.on('fetch_msgs', (data) => {
    	const { userId } = data;
	    // Insert the message into the database
	    const sql = 'SELECT msg, room_id FROM tbl_msg WHERE (room_id = ? AND to_room = ?) OR (to_room = ? AND room_id = ?)';
	    db.query(sql, ['admin_room', userId, 'admin_room', userId], (err, results) => { 
	    	if (err) {
	    		console.error('Database select error: ' + err.message);
	    		return;
	    	}

	    	const messages = results.map((row) => ({
	    		room_id: row.room_id,
	    		msg: row.msg,
	    	}));

	    	io.to('admin_room').emit('fetch_msgs', messages);
	    });
	});



    //Function to check if any user is disconnected
    socket.on('disconnect', () => {

    	const roomId = userRooms[socket.id];

    	if (roomId) {
        // Update the 'is_online' column in the 'customers' table
        const updateSql = 'UPDATE customers SET is_online = ? WHERE room = ?';
        db.query(updateSql, ['', roomId], (updateErr, updateResult) => {
        	if (updateErr) {
        		console.error('Database update error: ' + updateErr.message);
        		return;
        	}

            // Emit user_disconnected event to the admin room
            io.to('admin_room').emit('user_disconnected', { roomId, userId: socket.id });
            delete userRooms[socket.id]; // Remove the user's room association
        });
    }
});


});



server.listen(3001, () => {
	console.log('Server is running on port 3001');
});
