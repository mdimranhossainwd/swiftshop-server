const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.SWIFT_SHOP_USER_NAME}:${process.env.SWIFT_SHOP_PASSWORD}@cluster0.2xcsswz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const dbCollection = client.db("swiftshopDB");
    const featuresCollection = dbCollection.collection("features");
    const usersCollection = dbCollection.collection("users");
    const ordersCollection = dbCollection.collection("orders");
    const blogsCollection = dbCollection.collection("blogs");

    // User's Order Data
    app.post("/swiftshop/api/v1/orders", async (req, res) => {
      const body = req.body;
      const result = await ordersCollection.insertOne(body);
      res.send(result);
    });

    // Get All Orders Product All Data
    app.get("/swiftshop/api/v1/orders", async (req, res) => {
      const cursor = await ordersCollection.find().toArray();
      res.send(cursor);
    });

    // Get User's Specific Order Product Data
    app.get("/swiftshop/api/v1/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await ordersCollection.findOne(query);
      res.send(cursor);
    });

    // Order Product data update
    app.put("/swiftshop/api/v1/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const addProductData = req.body;
      const updateDoc = {
        $set: {
          ...addProductData,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // User's Data Saved in DB
    app.post("/swiftshop/api/v1/users", async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.send(result);
    });

    // Get Features Product All Data
    app.get("/swiftshop/api/v1/features", async (req, res) => {
      const cursor = await featuresCollection.find().toArray();
      res.send(cursor);
    });

    // Get Specific Features Product Data
    app.get("/swiftshop/api/v1/features/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await featuresCollection.findOne(query);
      res.send(cursor);
    });

    // Get Blogs Data
    app.get("/swiftshop/api/v1/blogs", async (req, res) => {
      const cursor = await blogsCollection.find().toArray();
      res.send(cursor);
    });

    // Get Specific Blogs Data
    app.get("/swiftshop/api/v1/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await blogsCollection.findOne(query);
      res.send(cursor);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("swift-shop server is Running ---->");
});

app.listen(port, () => {
  console.log(`swift-shop server Currently Running on: ----> ${port}`);
});
