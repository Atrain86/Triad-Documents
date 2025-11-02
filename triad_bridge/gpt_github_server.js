// GPT GitHub MCP Bridge Server
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PORT = 4001; // Different port from the main GitHub MCP server
const HEADERS = {
  Authorization: `token ${GITHUB_TOKEN}`,
  "Content-Type": "application/json",
  "User-Agent": "GPT-MCP-Server"
};

// ========== ROUTES ==========

// 1. List Repository Contents
app.get("/github/list", async (req, res) => {
  const { owner, repo, path = "", ref = "main" } = req.query;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
  
  try {
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get File Content
app.get("/github/content", async (req, res) => {
  const { owner, repo, path, ref = "main" } = req.query;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
  
  try {
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    
    if (data.content) {
      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      res.json({ content, sha: data.sha });
    } else {
      res.status(404).json({ error: "Content not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. List Branches
app.get("/github/branches", async (req, res) => {
  const { owner, repo } = req.query;
  const url = `https://api.github.com/repos/${owner}/${repo}/branches`;
  
  try {
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Branch Details
app.get("/github/branch", async (req, res) => {
  const { owner, repo, branch } = req.query;
  const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
  
  try {
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Create or Update File
app.post("/github/commit", async (req, res) => {
  const { owner, repo, path, message, content, branch = "main", sha } = req.body;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const body = {
      message,
      content,
      branch,
      ...(sha && { sha }) // Include sha only if provided
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      res.status(response.status).json(error);
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create Branch
app.post("/github/create-branch", async (req, res) => {
  const { owner, repo, newBranch, fromBranch = "main" } = req.body;
  
  try {
    // Get source branch SHA
    const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${fromBranch}`;
    const refRes = await fetch(refUrl, { headers: HEADERS });
    const refData = await refRes.json();
    const sha = refData.object.sha;

    // Create new branch
    const createUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
    const response = await fetch(createUrl, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Create Pull Request
app.post("/github/create-pr", async (req, res) => {
  const { owner, repo, title, body, head, base = "main" } = req.body;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ title, body, head, base })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅ GPT GitHub MCP server active on http://localhost:${PORT}`)
);
