// import express from 'express'
const { tavily } = require('@tavily/core');

const express = require('express')
const app = express()

const client = tavily({apiKey:process.env.TAVILY_API_KEY})
app.use(express.json())
app.post("/ask",async(req,res)=>{
    // Get the query from the user 
    const query = req.body.query
    // Check for the credit /access
    // Search for the similar query from the indexed database 
    // Web Search 
  const WebRepsonse = await  client.search(query, {
    searchDepth: "advanced"
})

    // Context Engineering on query and wenb search 
    // hit the LLM and stream the response 
    // stream  back the resources and folow up questions
})
app.listen(3000,()=>{
    console.log("Server Started !")
})