import Navbar from "./components/Navbar";
import { useEffect, useState } from "react";
import About from "./components/Aboutt";
import { Routes, Route, useNavigate } from "react-router-dom";
import { createContext } from "react";
import Login from "./components/login.js";
import SignUp from "./components/signup.js";
import Home from "./components/Home";
import Workspace from "./components/Workspace.js";

const userContext = createContext();
function App() {
  const [mode, setMode] = useState("light");
  const [namee, setNamee] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const navigate = useNavigate();

  useEffect(() => {
    setAuthToken(localStorage.getItem("authToken"));
    if (!authToken) {
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        navigate("/login");
      }
    } else {
      setNamee(localStorage.getItem("username"));
      if (
        window.location.pathname === "/login" ||
        window.location.pathname === "/signup"
      ) {
        navigate("/");
      }
    }
  }, [authToken, navigate]);

  const [text, setText] = useState("");

  return (
    <userContext.Provider
      value={{
        namee,
        setNamee,
        text,
        setText,
      }}
    >
      <div
        className="container-fluid"
        style={{
          width: "100vw",
          height: "100vh",
          marginTop: "20px",
          display: "flex",
          flexDirection: "column",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          position: "relative",
        }}
      >
        <Navbar title="Code Editor" mode={mode} />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Home />
              </>
            }
          />

          <Route path="/about" element={<About />} />
          <Route path="/workspace/:roomcode" element={<Workspace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          {/* <Route path="/test/:testnum/:questionnum" element={<TestPage />} />
          <Route path="/result/:testnum" element={<Result />} />
          <Route
            path="/admin"
            element={
              <>
                <h1>Hello {namee}</h1>
                <AdminPage />
              </>
            }
          />
          <Route path="/admin/test/:testnum" element={<TestDetail />} />
          <Route path="admin/addtest" element={<Addtest />} /> */}
        </Routes>
      </div>
    </userContext.Provider>
  );
}

export default App;
export { userContext };
