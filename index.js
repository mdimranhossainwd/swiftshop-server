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
    const reviewsCollection = dbCollection.collection("reviews");
    const cartsCollection = dbCollection.collection("carts");

    // User's Order Data
    app.post("/swiftshop/api/v1/orders", async (req, res) => {
      const body = req.body;
      const result = await ordersCollection.insertOne(body);
      res.send(result);
    });

    // Add or Update Cart Product
    app.post("/swiftshop/api/v1/carts", async (req, res) => {
      const { _id, email, quantity } = req.body;
      const existingProduct = await cartsCollection.findOne({ _id, email });

      if (existingProduct) {
        const result = await cartsCollection.updateOne(
          { _id, email },
          { $inc: { quantity: quantity || 1 } }
        );
        res.send(result);
      } else {
        const result = await cartsCollection.insertOne({
          ...req.body,
          quantity: 1,
        });
        res.send(result);
      }
    });

    // Get Buy a product and saved this data to DB
    app.get("/swiftshop/api/v1/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // Delete to a Cart procuts data in DB
    app.delete("/swiftshop/api/v1/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await cartsCollection.deleteOne(query);
      res.send(cursor);
    });

    // User's can posted review
    app.post("/swiftshop/api/v1/reviews", async (req, res) => {
      const body = req.body;
      const result = await reviewsCollection.insertOne(body);
      res.send(result);
    });

    // Get User's Posted All Review Data
    app.get("/swiftshop/api/v1/reviews", async (req, res) => {
      const cursor = await reviewsCollection.find().toArray();
      res.send(cursor);
    });

    // Get Order product data specefic user's email
    app.get("/swiftshop/api/v1/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

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

    //  Update Order Product status
    app.patch("/swiftshop/api/v1/orders/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await ordersCollection.updateOne(query, updateDoc);
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

    // Delete Specific Features Product Data
    app.delete("/swiftshop/api/v1/features/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const cursor = await featuresCollection.deleteOne(query);
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
