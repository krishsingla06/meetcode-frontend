// import React, { useState, useRef, useEffect } from "react";
// import Editor from "@monaco-editor/react";
// import "./workspace.css";

// const Workspace = () => {
//   const [code, setCode] = useState(`function sayHi() {
//   console.log("👋 Hello world");
// }

// sayHi();`);

//   const [sidebarWidth, setSidebarWidth] = useState(200);
//   const [activePanel, setActivePanel] = useState("files"); // "files" | "chat"
//   const isResizing = useRef(false);

//   const handleMouseDown = () => {
//     isResizing.current = true;
//   };

//   const handleMouseMove = (e) => {
//     if (!isResizing.current) return;
//     const newWidth = e.clientX - 50;
//     if (newWidth > 100 && newWidth < 500) setSidebarWidth(newWidth);
//   };

//   const handleMouseUp = () => {
//     isResizing.current = false;
//   };

//   useEffect(() => {
//     window.addEventListener("mousemove", handleMouseMove);
//     window.addEventListener("mouseup", handleMouseUp);
//     return () => {
//       window.removeEventListener("mousemove", handleMouseMove);
//       window.removeEventListener("mouseup", handleMouseUp);
//     };
//   }, []);

//   const renderSidebarContent = () => {

//     if (activePanel === "chat") {
//       return (
//         <div className="chat-box">
//           <h3>Team Chat</h3>

//           <div className="chat-messages">
//             <p> Hello chat !! </p>
//             <p> Talk here !! </p>
//             <p> Spread love and positivity.</p>
//           </div>

//           {/* Message Input Bar */}
//           <div className="chat-input-row">
//             <input
//               type="text"
//               placeholder="Type a message..."
//               className="chat-message-input"
//             />
//             <button className="chat-send-btn" title="Send">
//               ➤
//             </button>
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div>
//         <h3>Your Files</h3>
//         <ul>
//           <li>index.js</li>
//           <li>style.css</li>
//           <li>app.js</li>
//         </ul>
//       </div>
//     );
//   };

//   return (
//     <div className="workspace-container">
//       <div className="workspace-main">
//         <div className="vertical-toolbar">
//           <button title="Files" onClick={() => setActivePanel("files")}>
//             🗂
//           </button>
//           <button title="Chat" onClick={() => setActivePanel("chat")}>
//             💬
//           </button>
//         </div>

//         <div className="file-sidebar" style={{ width: ` ${sidebarWidth}px` }}>
//           {renderSidebarContent()}
//         </div>

//         <div className="resizer" onMouseDown={handleMouseDown} />

//         <div className="code-editor">
//           <Editor
//             language="javascript"
//             value={code}
//             onChange={(value) => setCode(value || "")}
//             theme="vs-dark"
//             options={{
//               fontSize: 16,
//               minimap: { enabled: false },
//               fontFamily: "Courier New, monospace",
//               automaticLayout: true,
//             }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Workspace;

import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import "./workspace.css";

const Workspace = () => {
  // Initial files object with one file created by default.
  const [files, setFiles] = useState({
    "index.js": `function sayHi() {
  console.log("👋 Hello world");
}

sayHi();`,
  });
  // Keep track of the active file name.
  const [activeFile, setActiveFile] = useState("index.js");
  // Code state reflects the content of the currently active file.
  const [code, setCode] = useState(files[activeFile]);

  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [activePanel, setActivePanel] = useState("files"); // "files" | "chat"
  const isResizing = useRef(false);

  // Whenever the active file changes or files update, load that file's content
  useEffect(() => {
    setCode(files[activeFile] || "");
  }, [activeFile, files]);

  const handleMouseDown = () => {
    isResizing.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX - 50;
    if (newWidth > 100 && newWidth < 500) setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    isResizing.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Update current file content in state when changes are made in the editor.
  const handleEditorChange = (newCode) => {
    setCode(newCode);
    setFiles((prevFiles) => ({
      ...prevFiles,
      [activeFile]: newCode,
    }));
  };

  // Create a new file by prompting the user for a filename.
  const handleCreateFile = () => {
    const fileName = prompt(
      "Enter the new file name (e.g. newFile.js or newFile.cpp):"
    );
    if (!fileName) return; // Exit if the filename is empty or cancelled.
    if (files[fileName]) {
      alert("A file with that name already exists.");
      return;
    }
    setFiles((prevFiles) => ({
      ...prevFiles,
      [fileName]: "",
    }));
    setActiveFile(fileName);
  };

  // Delete a file using a functional update so that we use the latest state.
  const handleDeleteFile = (fileName) => {
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    setFiles((prevFiles) => {
      const updatedFiles = { ...prevFiles };
      delete updatedFiles[fileName];
      // If deleting the active file, update activeFile to the first remaining file (if any)
      if (fileName === activeFile) {
        const remainingFiles = Object.keys(updatedFiles);
        setActiveFile(remainingFiles[0] || "");
      }
      return updatedFiles;
    });
  };

  // Rename a file. Prompts for a new name and updates the key if valid.
  const handleRenameFile = (oldName) => {
    const newName = prompt("Enter the new file name:", oldName);
    if (!newName || newName === oldName) return;
    if (files[newName]) {
      alert("A file with that name already exists.");
      return;
    }
    setFiles((prevFiles) => {
      const newFiles = {};
      Object.keys(prevFiles).forEach((key) => {
        if (key === oldName) {
          newFiles[newName] = prevFiles[oldName];
        } else {
          newFiles[key] = prevFiles[key];
        }
      });
      return newFiles;
    });
    if (activeFile === oldName) {
      setActiveFile(newName);
    }
  };

  // Determine the language for the Monaco Editor based on the file extension.
  const getEditorLanguage = () => {
    if (activeFile.endsWith(".js") || activeFile.endsWith(".jsx"))
      return "javascript";
    if (activeFile.endsWith(".ts") || activeFile.endsWith(".tsx"))
      return "typescript";
    if (activeFile.endsWith(".cpp") || activeFile.endsWith(".c")) return "cpp";
    if (activeFile.endsWith(".py")) return "python";
    if (activeFile.endsWith(".css")) return "css";
    if (activeFile.endsWith(".html")) return "html";
    return "plaintext";
  };

  // Render the content of the sidebar based on the current panel.
  const renderSidebarContent = () => {
    if (activePanel === "chat") {
      return (
        <div className="chat-box">
          <h3>Team Chat</h3>
          <div className="chat-messages">
            <p>Hello chat !!</p>
            <p>Talk here !!</p>
            <p>Spread love and positivity.</p>
          </div>
          {/* Message Input Bar */}
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Type a message..."
              className="chat-message-input"
            />
            <button className="chat-send-btn" title="Send">
              ➤
            </button>
          </div>
        </div>
      );
    }

    // Files panel: list files with rename and delete options and a button to create a new file.
    return (
      <div>
        <h3>Your Files</h3>
        <ul className="file-list">
          {Object.keys(files).map((fileName) => (
            <li
              key={fileName}
              className={fileName === activeFile ? "active" : ""}
            >
              <span
                className="file-name"
                onClick={() => setActiveFile(fileName)}
              >
                {fileName}
              </span>
              <span
                className="rename-file"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameFile(fileName);
                }}
                title="Rename File"
              >
                ✏
              </span>
              <span
                className="delete-file"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFile(fileName);
                }}
                title="Delete File"
              >
                ❌
              </span>
            </li>
          ))}
        </ul>
        <button className="create-file-btn" onClick={handleCreateFile}>
          + New File
        </button>
      </div>
    );
  };

  return (
    <div className="workspace-container">
      <div className="workspace-main">
        {/* Vertical Toolbar */}
        <div className="vertical-toolbar">
          <button title="Files" onClick={() => setActivePanel("files")}>
            🗂
          </button>
          <button title="Chat" onClick={() => setActivePanel("chat")}>
            💬
          </button>
        </div>

        {/* Sidebar */}
        <div className="file-sidebar" style={{ width: `${sidebarWidth}px` }}>
          {renderSidebarContent()}
        </div>

        {/* Resizer */}
        <div className="resizer" onMouseDown={handleMouseDown} />

        {/* Code Editor */}
        <div className="code-editor">
          <Editor
            language={getEditorLanguage()}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontSize: 16,
              minimap: { enabled: false },
              fontFamily: "Courier New, monospace",
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
