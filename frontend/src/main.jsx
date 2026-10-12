import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />

    <ToastContainer
      position="top-right"
      autoClose={3000}
      theme="light"
      toastStyle={{
        backgroundColor: "#f5eee7",
        color: "#6f452c",
        border: "1px solid #d6c0ad",
      }}
    />
  </BrowserRouter>
);