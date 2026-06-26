// import express from 'express'
// const { tavily } = require('@tavily/core');
import {tavily} from "@tavily/core"
import { GoogleGenAI } from "@google/genai";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompt.js";
// import z from "zod";
import express from "express"
import dotenv from "dotenv";
import { prisma } from "./db.js";
import { Auth } from "./middleware.js";
import cors from 'cors'
// const express = require('express')
const app = express()

const client = tavily({apiKey:process.env.TAVILY_API_KEY})
app.use(cors({
    exposedHeaders: ['X-Conversation-Id']
}))
app.use(express.json())
app.use(Auth)
app.post("/signup",async(req,res)=>{
    const {email, name, provider} = req.body;
    try {
        const existingUser = await prisma.user.findFirst({ where: { id: req.userid } });
        if (existingUser) {
            return res.json(existingUser);
        }
        const user = await prisma.user.create({
            data: {
                id: req.userid,
                email,
                name,
                provider
            }
        });
        res.json(user);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
})

app.post("/signin",async(req,res)=>{
    try {
        const user = await prisma.user.findFirst({
            where: {
                id: req.userid
            }
        });
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
})

app.get("/conversation",async(req,res)=>{
    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                UserId: req.userid
            }
        });
        res.json(conversations);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
})

app.get("/conversation/:conversationId",async(req,res)=>{
    try {
        const { conversationId } = req.params;
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                UserId: req.userid
            },
            include: {
                Messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });
        if (!conversation) {
            return res.status(404).json({message: "Conversation not found"});
        }
        res.json(conversation);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
})
app.post("/ask",async(req,res)=>{
    try {
        // Get the query from the user 
        const query = req.body.query
        
        // Create conversation in DB
        const conversation = await prisma.conversation.create({
            data: {
                title: query.substring(0, 50),
                slug: query.substring(0, 50).toLowerCase().replace(/[^a-z0-9]+/g, '-') || "conversation",
                UserId: req.userid
            }
        });
        
        // Save user message
        await prisma.message.create({
            data: {
                content: query,
                role: 'User',
                conversationId: conversation.id
            }
        });

        // Set conversation ID in headers so client can access it
        res.setHeader('X-Conversation-Id', conversation.id);

        // Check for the credit /access
        // Search for the similar query from the indexed database 
        // Web Search 
        const WebRepsonse = await client.search(query, {
            searchDepth: "advanced"
        })
        const WebSearchResult = WebRepsonse.results
        
        // Context Engineering on query and wenb search 
        // hit the LLM and stream the response 
        const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});

        const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}",JSON.stringify(WebSearchResult))
        .replace("{{USER_QUERY}}",query)

        const response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            system:SYSTEM_PROMPT,
        });

        let assistantResponse = "";
        for await (const chunk of response) {
            const text = chunk.candidates[0]?.content?.parts[0]?.text || "";
            assistantResponse += text;
            res.write(text)
        }
        res.write("\n________Sources____________________\n")
        // stream  back the resources and folow up questions
        const sourcesJson = JSON.stringify(WebSearchResult.map(results=>({url:results.url})));
        res.write(sourcesJson)
        
        assistantResponse += "\n________Sources____________________\n" + sourcesJson;
        
        // Save assistant message
        await prisma.message.create({
            data: {
                content: assistantResponse,
                role: 'Assistant',
                conversationId: conversation.id
            }
        });

        // End stream 
        res.end()
    } catch (e) {
        if (!res.headersSent) {
            res.status(500).json({error: e.message});
        } else {
            res.end();
        }
    }
})
app.post("/ask/followup",async(req,res)=>{
    try {
        const { query, conversationId } = req.body;
        
        if (!conversationId || !query) {
            return res.status(400).json({error: "conversationId and query are required"});
        }

        // Get the existing chat from the db 
        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, UserId: req.userid },
            include: { Messages: { orderBy: { createdAt: 'asc' } } }
        });
        
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }
        
        // Save user message
        await prisma.message.create({
            data: {
                content: query,
                role: 'User',
                conversationId
            }
        });

        const historyStr = conversation.Messages.map(m => `${m.role}: ${m.content}`).join("\n\n");

        // Web Search 
        const WebRepsonse = await client.search(query, { searchDepth: "advanced" })
        const WebSearchResult = WebRepsonse.results
        
        // Forward the full history to the LLM 
        const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});

        const prompt = PROMPT_TEMPLATE
        .replace("{{WEB_SEARCH_RESULTS}}",JSON.stringify(WebSearchResult))
        .replace("{{USER_QUERY}}", `History of Conversation:\n${historyStr}\n\nLatest Query:\n${query}`)

        const response = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: prompt,
            system:SYSTEM_PROMPT,
        });

        // Stream back the response to user 
        let assistantResponse = "";
        for await (const chunk of response) {
            const text = chunk.candidates[0]?.content?.parts[0]?.text || "";
            assistantResponse += text;
            res.write(text)
        }
        res.write("\n________Sources____________________\n")
        const sourcesJson = JSON.stringify(WebSearchResult.map(results=>({url:results.url})));
        res.write(sourcesJson)
        
        assistantResponse += "\n________Sources____________________\n" + sourcesJson;
        
        // Save assistant message
        await prisma.message.create({
            data: {
                content: assistantResponse,
                role: 'Assistant',
                conversationId
            }
        });

        res.end()
    } catch (e) {
        if (!res.headersSent) {
            res.status(500).json({error: e.message});
        } else {
            res.end();
        }
    }
})
app.listen(3000,()=>{
    console.log("Server Started !")
})