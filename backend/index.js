// import express from 'express'
// const { tavily } = require('@tavily/core');
import {tavily} from "@tavily/core"
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompt.js";
// import z from "zod";
import express from "express"
import dotenv from "dotenv";

// const express = require('express')
dotenv.config()
const app = express()

const client = tavily({apiKey:process.env.TAVILY_API_KEY})
app.use(express.json())
app.post("/signup",async(req,res)=>{
    
})
app.post("/ask",async(req,res)=>{
    // Get the query from the user 
    const query = req.body.query
    // Check for the credit /access
    // Search for the similar query from the indexed database 
    // Web Search 
  const WebRepsonse = await  client.search(query, {
    searchDepth: "advanced"
})
const WebSearchResult = WebRepsonse.results
    // Context Engineering on query and wenb search 
    // hit the LLM and stream the response 
    const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});

    // const Answer =z.object({
    //     followups:z.string(),
    //     answer:z.string()
    // }) 
    const prompt = PROMPT_TEMPLATE
    .replace("{{WEB_SEARCH_RESULTS}}",JSON.stringify(WebSearchResult))
    .replace("{{USER_QUERY}}",query)

     const response = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: prompt,
    system:SYSTEM_PROMPT,

  });
  for await (const chunk of response) {
  res.write(chunk.candidates[0].content.parts[0].text)
}
res.write("\n________Sources____________________\n")
    // stream  back the resources and folow up questions
    res.write(JSON.stringify(WebSearchResult.map(results=>({url:results.url}))))
// End stream 
res.end()
})
app.listen(3000,()=>{
    console.log("Server Started !")
})