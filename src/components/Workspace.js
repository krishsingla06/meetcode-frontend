import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import debounce from "lodash.debounce";
import "./workspace.css";

const BASE_URL=process.env.REACT_APP_API_URL;
const socket = io(process.env.REACT_APP_API_URL, {
  withCredentials: true,
});

const defaultCodeTemplates = {
  javascript: `console.log("Hello from JS!");`,
  python: `print("Hello from Python!")`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello from C++!" << endl;\n  return 0;\n}`,
  html: `<!DOCTYPE html>\n<html>\n<head><title>New Page</title></head>\n<body>\n  <h1>Hello HTML</h1>\n</body>\n</html>`,
};

const repoCode = localStorage.getItem("joinedRepoCode");

const Workspace = () => {
  const [activePanel, setActivePanel] = useState("files");
  const [activeFile, setActiveFile] = useState("index.html");
  const [showModal, setShowModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [stdin, setStdin] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [newFileLang, setNewFileLang] = useState("javascript");
  // const [chatMessages, setChatMessages] = useState([
  //   "Hello chat !!",
  //   "Talk here !!",
  //   "Spread love and positivity.",
  // ]);
  const [chatInput, setChatInput] = useState("");
  const [files, setFiles] = useState({});
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");

  const getLanguageFromFilename = (filename) => {
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".css")) return "css";
    if (filename.endsWith(".html")) return "html";
    if (filename.endsWith(".py")) return "python";
    if (filename.endsWith(".cpp")) return "cpp";
    return "plaintext";
  };

  const handleCreateFile = () => {
    if (!newFileName) return;
  
    let extension = "";
    if (newFileLang === "javascript") extension = ".js";
    else if (newFileLang === "python") extension = ".py";
    else if (newFileLang === "cpp") extension = ".cpp";
    else if (newFileLang === "html") extension = ".html";
  
    const fullFileName = newFileName + extension;
    const content = defaultCodeTemplates[newFileLang] || "";
  
    // Update local state
    const updated = { ...files, [fullFileName]: content };
    setFiles(updated);
    setActiveFile(fullFileName);
    setShowModal(false);
    setNewFileName("");
    setNewFileLang("javascript");
  
    // 🔄 Real-time file broadcast via socket
    socket.emit("file-created", {
      repoCode,
      file: fullFileName,
      content: content,
    });
  
    // Save to DB via API
    const token = localStorage.getItem("authToken");
    fetch(`${BASE_URL}/api/files/${repoCode}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: fullFileName,
        content,
      }),
    }).catch(err => console.error("Error saving file:", err));
  };
  const [chatMessages, setChatMessages] = useState([
    { username: "System", message: "Welcome to the chat!", timestamp: new Date() }
  ]);
  
  const handleSendMessage = () => {
    if (!chatInput) {
      console.error("Chat input is undefined or null.");
      return;
    }
  
    const trimmed = chatInput.trim();
    if (trimmed) {
      try {
        const username = localStorage.getItem("username") || "Anonymous";
  
        socket.emit("send-message", {
          repoCode,
          message: trimmed,
          username,
        });
  
        setChatInput("");
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };
  useEffect(() => {
    if (!repoCode) return;
  
    const username = localStorage.getItem("username") || "Guest";
  
    if (currentRoomRef.current && currentRoomRef.current !== repoCode) {
      socket.emit("leave-room", currentRoomRef.current);
    }
  
    currentRoomRef.current = repoCode;
    socket.emit("join-room", repoCode, username);
  
    // ... existing code ...
  
    // Chat-specific socket event listeners
    socket.on("new-message", (message) => {
      setChatMessages((prevMessages) => [...prevMessages, message]);
    });
    
    socket.on("chat-history", (messages) => {
      setChatMessages(messages);
    });
    
    socket.on("chat-error", ({ error }) => {
      console.error("Chat error:", error);
      // Optionally display an error to the user
    });
    
    return () => {
      socket.emit("leave-room", repoCode);
      // ... existing cleanup ...
      socket.off("new-message");
      socket.off("chat-history");
      socket.off("chat-error");
    };
  }, [repoCode]);
  
  const handleRunCode = async () => {
    const language = getLanguageFromFilename(activeFile);
    const supportedLanguages = ["python", "javascript", "cpp"];

    if (!supportedLanguages.includes(language)) {
      setOutput("⚠️ This file type is not supported for execution.");
      return;
    }

    setIsRunning(true);
    setOutput("⏳ Running...");

    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(`${BASE_URL}/api/run-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: files[activeFile],
          language: language,
          stdin: stdin,
        }),
      });

      const result = await res.json();

      if (result.stderr) {
        setOutput(`❌ Error:\n${result.stderr}`);
      } else if (result.compile_output) {
        setOutput(`⚙️ Compilation Error:\n${result.compile_output}`);
      } else if (result.output) {
        setOutput(`✅ Output:\n${result.output}`);
      } else {
        setOutput(`❌ Unknown Error:\n${JSON.stringify(result, null, 2)}`);
      }
    } catch (err) {
      setOutput("❗ Failed to execute code.");
      console.error("Execution error:", err);
    }

    setIsRunning(false);
  };

  const handleDeleteFile = (filename) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      // Remove from local state first
      setFiles((prevFiles) => {
        const updated = { ...prevFiles };
        delete updated[filename];
        
        // Update active file if deleted
        if (activeFile === filename) {
          const remaining = Object.keys(updated);
          setActiveFile(remaining.length ? remaining[0] : "");
        }
        
        return updated;
      });
      
      // Emit socket event for real-time notification to other users
      socket.emit("file-deleted", {
        repoCode,
        filePath: filename
      });
      
      // Also delete through REST API as a backup
      const token = localStorage.getItem("authToken");
      fetch(`${BASE_URL}/api/files/${repoCode}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename }),
      })
      .then(response => {
        if (!response.ok) {
          console.error("Failed to delete file via API", response.status);
        }
      })
      .catch(err => console.error("Error deleting file via API:", err));
    }
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMessage = { role: "user", content: aiInput.trim() };
    // setAiMessages("");
    // setAiMessages((prev) => [...prev, userMessage]);
    // setAiInput("");

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer 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",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free", // Replace with your chosen model
          messages: [...aiMessages, userMessage],
        }),
      });

      const data = await response.json();
      if (data && data.choices && data.choices[0]) {
        const aiResponse = {
          role: "assistant",
          content: data.choices[0].message.content,
        };
        setAiMessages((prev) => [...prev, aiResponse]);
        setAiInput("");
      } else {
        console.error("Unexpected API response:", data);
      }
    } catch (error) {
      console.error("Error calling OpenRouter API:", error);
    }
  };

  const renderSidebarContent = () => {
    if (activePanel === "chat") {
      return (
        <div className="chat-box">
          <h3>Team Chat</h3>
          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="chat-message">
                <span className="chat-username">{msg.username || "Anonymous"}: </span>
                <span className="chat-text">{msg.message}</span>
                {msg.timestamp && (
                  <div className="chat-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Type a message..."
              className="chat-message-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button className="chat-send-btn" title="Send" onClick={handleSendMessage}>
              ➤
            </button>
          </div>
        </div>
      );
    }
    
    if (activePanel === "output") {
      return (
        <div>
          <div className="output-panel">
            <div>
              <h3>Standard Input (stdin)</h3>
              <textarea className="stdin-input"
                rows={4}
                placeholder="Enter input for the program..."
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                style={{ width: "100%", padding: "8px", fontFamily: "monospace" }}
              />
            </div>
            <h3>Execution Output</h3>
            <pre className="code-output" style={{ whiteSpace: "pre-wrap" }}>
              {output || "No output yet."}
            </pre>
          </div>
          <div className="run-controls">
            <button onClick={handleRunCode} disabled={isRunning}>
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>
        </div>
      );
    }

    if (activePanel === "users") {
      return (
        <div className="users-panel">
          <h3>Active Users</h3>
          <ul className="user-list">
            {activeUsers.map((user, idx) => (
              <li key={idx}>👤 {user.name}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (activePanel === "ai-assistance") {
      return (
        <div className="ai-assistance-panel">
          <h3>AI Assistance 🤖</h3>
          <div className="ai-chatbox">
            <div className="ai-messages">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`ai-message ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  <strong>{msg.role === "user" ? "You" : "AI"}:</strong> {msg.content}
                </div>
              ))}
            </div>
            <textarea
              className="ai-input"
              placeholder="Ask the AI something..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAiSubmit(e)}
            />
            <button className="ai-submit-btn" onClick={handleAiSubmit}>
              Send
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h3>Your Files</h3>
        <button className="chat-send-btn" onClick={() => setShowModal(true)}>
          ➕ Add File
        </button>
        <ul className="file-list">
          {Object.keys(files).map((filename) => (
            <li
              key={filename}
              className={activeFile === filename ? "active-file" : ""}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                onClick={() => setActiveFile(filename)}
                style={{ flex: 1, cursor: "pointer" }}
              >
                {filename}
              </span>
              <button
                onClick={() => handleDeleteFile(filename)}
                title="Delete File"
                style={{
                  background: "none",
                  border: "none",
                  color: "#f55",
                  cursor: "pointer",
                  fontSize: "14px",
                  marginLeft: "8px",
                }}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  const handleEditorChange = debounce((value) => {
    const updatedFiles = { ...files, [activeFile]: value };
    setFiles(updatedFiles);
  
    socket.emit("code-change", {
      repoCode,
      filename: activeFile,
      code: value,
    });
  
    const token = localStorage.getItem("authToken");
  
    fetch(`${BASE_URL}/api/files/${repoCode}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: activeFile,
        content: value,
      }),
    }).catch((err) => console.error("Failed to save code:", err));
  }, 500);
  

  const currentRoomRef = useRef(null); // track the current joined room
  useEffect(() => {
    if (!repoCode) return;
  
    const username = localStorage.getItem("username") || "Guest";
  
    if (currentRoomRef.current && currentRoomRef.current !== repoCode) {
      socket.emit("leave-room", currentRoomRef.current);
    }
  
    currentRoomRef.current = repoCode;
    socket.emit("join-room", repoCode, username);
  
    // Load files from database on mount
    const token = localStorage.getItem("authToken");
    fetch(`${BASE_URL}/api/files/${repoCode}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.files) {
          setFiles(data.files);
          // Set active file to the first file if no active file is set
          if (!activeFile || !(activeFile in data.files)) {
            const fileKeys = Object.keys(data.files);
            if (fileKeys.length > 0) {
              setActiveFile(fileKeys[0]);
            }
          }
        }
      })
      .catch((err) => console.error("Error loading files:", err));
  
    // Setup socket event listeners
    socket.on("code-update", ({ filename, code }) => {
      setFiles((prevFiles) => {
        if (prevFiles[filename] === code) return prevFiles;
        return { ...prevFiles, [filename]: code };
      });
    });
  
    socket.on("file-created", (file) => {
      if (!file || !file.path) return;
      setFiles((prevFiles) => {
        if (prevFiles[file.path]) return prevFiles;
        return { ...prevFiles, [file.path]: file.content || "" };
      });
    });
  
    socket.on("file-deleted", ({ filePath }) => {
      console.log(`Received file-deleted event for ${filePath}`);
      
      setFiles((prevFiles) => {
        if (!prevFiles[filePath]) {
          console.log(`File ${filePath} not found in local state, nothing to delete`);
          return prevFiles;
        }
        
        console.log(`Removing file ${filePath} from local state`);
        const updated = { ...prevFiles };
        delete updated[filePath];
        
        // Update active file if needed
        if (activeFile === filePath) {
          const remaining = Object.keys(updated);
          setActiveFile(remaining.length ? remaining[0] : "");
        }
        
        return updated;
      });
    });
  
    socket.on("update-users", (users) => {
      setActiveUsers(users);
    });
  
    socket.on("initial-files", (filesArray) => {
      const filesObj = {};
      filesArray.forEach(file => {
        filesObj[file.path] = file.content;
      });
      
      setFiles(filesObj);
      
      // Set active file to the first file if we have files
      if (Object.keys(filesObj).length > 0 && !activeFile) {
        setActiveFile(Object.keys(filesObj)[0]);
      }
    });
  
    return () => {
      socket.emit("leave-room", repoCode);
      socket.off("code-update");
      socket.off("file-created");
      socket.off("file-deleted");
      socket.off("update-users");
      socket.off("initial-files");
    };
  }, [repoCode]);
  

  return (
    <div className="workspace-container">
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New File</h3>
            <input
              type="text"
              placeholder="Enter file name (no extension)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
            <select
              value={newFileLang}
              onChange={(e) => setNewFileLang(e.target.value)}
            >
              <option value="javascript">JavaScript (.js)</option>
              <option value="python">Python (.py)</option>
              <option value="cpp">C++ (.cpp)</option>
              <option value="html">HTML (.html)</option>
            </select>
            <div style={{ marginTop: "10px" }}>
              <button onClick={handleCreateFile}>Create</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="workspace-main">
        <div className="vertical-toolbar">
          <button title="Files" onClick={() => setActivePanel("files")}>🗂</button>
          <button title="Chat" onClick={() => setActivePanel("chat")}>💬</button>
          <button title="Output" onClick={() => setActivePanel("output")}>📤</button>
          <button title="Active Users" onClick={() => setActivePanel("users")}>👥</button>
          <button title="AI Assistance" onClick={() => setActivePanel("ai-assistance")}>🤖</button>
        </div>

        <div className="file-sidebar">
          {renderSidebarContent()}
        </div>

        <div className="code-editor">
          <div className="editor-pane">
            {activeFile in files ? (
              <Editor
                language={getLanguageFromFilename(activeFile)}
                value={files[activeFile] || ""}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  fontSize: 16,
                  minimap: { enabled: false },
                  fontFamily: "Courier New, monospace",
                  automaticLayout: true,
                }}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#888",
                  fontSize: "18px",
                  fontStyle: "italic",
                }}
              >
                Select or create a file to start editing...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
