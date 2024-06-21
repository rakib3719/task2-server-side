const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://atg-world-67b51.web.app',
    'https://atg-world-67b51.firebaseapp.com'
  ],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// verify Token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: 'unauthorized access' });
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@cluster0.ngsjczb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollection = client.db('task2').collection('userData');
    const postCollection = client.db('task2').collection('postData');
    const commentCollection = client.db('task2').collection('commentData');
    // await client.connect();

    app.get('/checkUser/:userName', async (req, res) => {
      const userName = req.params.userName;
      const query = { userName: userName };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.post('/user', async (req, res) => {
      const userData = req.body;
      const result = await userCollection.insertOne(userData);
      res.send(result);
    });

    app.post('/createPost', verifyToken, async (req, res) => {
      const postData = req.body;
      if (postData.email !== req.user.email) {
        res.status(400).send('forbidden access');
        return;
      }
      postData.likes = [];
      const result = await postCollection.insertOne(postData);
      res.send(result);
    });

    app.get('/getPost', async (req, res) => {
      const result = await postCollection.find().sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.post('/addComment', verifyToken, async (req, res) => {
      const commentData = req.body;
      const result = await commentCollection.insertOne(commentData);
      res.send(result);
    });

    app.get('/getComment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { id: id };
      const result = await commentCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/getCommentCount/:id', async (req, res)=>{

      const id = req.params.id;
      const query = { id: id };
      const commentCount = (await commentCollection.find(query).toArray()).length;
      
      res.send({ commentCount }); 
    })

    app.put('/updatePost/:postId', verifyToken, async (req, res) => {
      const postId = req.params.postId;
      const { postContent } = req.body;
      const filter = { _id: new ObjectId(postId) };
      const updatedData = { $set: { postContent: postContent } };
      const options = { upsert: true };
      const result = await postCollection.updateOne(filter, updatedData, options);
      res.send(result);
    });

    app.put('/likePost/:postId', verifyToken, async (req, res) => {
      const postId = req.params.postId;
      const userId = req.user.email;
      const filter = { _id: new ObjectId(postId) };
      const update = {
        $addToSet: { likes: userId } // add userId to likes array if it doesn't already exist
      };
      const result = await postCollection.updateOne(filter, update);
      res.send(result);
    });

    app.put('/unlikePost/:postId', verifyToken, async (req, res) => {
      const postId = req.params.postId;
      const userId = req.user.email;
      const filter = { _id: new ObjectId(postId) };
      const update = {
        $pull: { likes: userId } // remove userId from likes array
      };
      const result = await postCollection.updateOne(filter, update);
      res.send(result);
    });

    app.delete('/deletePost/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.deleteOne(query);
      res.send(result);
    });

    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.TOKEN_SECRET, { expiresIn: '365d' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true });
    });

    app.get('/clearCookie', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true });
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('task2 server side is ready to work');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
