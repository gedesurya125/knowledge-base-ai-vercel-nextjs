"use client";
import React from "react";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();

  const [password, setPassword] = React.useState("");

  const isAuthEnabled = process?.env?.NEXT_PUBLIC_ENABLE_AUTH;
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    isAuthEnabled ? null : true
  );

  const authenticate = async (
    password: string,
    callBack?: (response: { isAuthenticated: boolean } | null) => void
  ) => {
    const response = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        password,
      }),
    }).then((res) => res.json());

    if (callBack) {
      callBack(response);
    }
  };

  if (!isAuthenticated)
    return (
      <div className="flex justify-center  items-center h-screen w-screen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <input
            type="password"
            placeholder="Enter your password"
            className="border border-1 border-black border-solid px-5 py-2 rounded"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              if (password) {
                authenticate(password, (response) => {
                  setIsAuthenticated(response?.isAuthenticated || false);
                });
              } else {
                setIsAuthenticated(false);
              }
            }}
            type="submit"
            className="border border-1 border-black border-solid px-5 py-2 rounded ml-2 hover:bg-gray-500 hover:text-white"
          >
            Login
          </button>
          {Boolean(password) && isAuthenticated === false && (
            <p className="mt-1 text-red-600">Wrong Password</p>
          )}
        </form>
      </div>
    );
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <div>
              <div className="font-bold">{m.role}</div>
              {m.parts.map((part) => {
                switch (part.type) {
                  case "text":
                    return <p>{part.text}</p>;
                  case "tool-addResource":
                  case "tool-getInformation":
                    return (
                      <p>
                        call{part.state === "output-available" ? "ed" : "ing"}{" "}
                        tool: {part.type}
                        <pre className="my-4 bg-zinc-100 p-2 rounded-sm">
                          {JSON.stringify(part.input, null, 2)}
                        </pre>
                      </p>
                    );
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
