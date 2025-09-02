"use client";
import React from "react";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import clsx from "clsx";
import { Spinner } from "@/components/icon/Spinner";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();

  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const isAuthEnabled = process?.env?.NEXT_PUBLIC_ENABLE_AUTH;
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    isAuthEnabled ? null : true
  );

  const authenticate = async (
    password: string,
    callBack?: (response: { isAuthenticated: boolean } | null) => void
  ) => {
    setLoading(true);
    const response = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        password,
      }),
    }).then((res) => res.json());

    if (callBack) {
      callBack(response);
    }
    setLoading(false);
  };

  if (!isAuthenticated)
    return (
      <div className="flex justify-center flex-col  items-center h-screen w-screen">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="flex"
        >
          <input
            type="password"
            placeholder="Enter your password"
            className="border border-1 border-black border-solid px-5 py-2 rounded"
            value={password}
            onChange={(e) => {
              setIsAuthenticated(null);
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
            className="border border-1 border-black border-solid px-5 py-2 rounded ml-2 hover:bg-gray-500 hover:text-white relative flex justify-center items-center w-max group"
          >
            <span
              className={clsx({
                "opacity-0": loading,
              })}
            >
              Login
            </span>
            {loading && (
              <span className={`absolute`}>
                <Spinner className="text-gray-500 group-hover:text-white" />
              </span>
            )}
          </button>
        </form>
        {Boolean(password) && isAuthenticated === false && (
          <p className="mt-1 text-red-600">Wrong Password</p>
        )}
      </div>
    );
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map((messageItem) => (
          <div key={messageItem.id} className="whitespace-pre-wrap">
            <div>
              <div className="font-bold">{messageItem.role}</div>
              {messageItem.parts.map((part) => {
                switch (part.type) {
                  case "text":
                    return <p className="mt-2">{part.text}</p>;
                  case "tool-addResource":
                  case "tool-getInformation":
                  case "tool-getDate":
                    return (
                      <LogContainer>
                        call
                        {part.state === "output-available"
                          ? "ed"
                          : "ing"} tool: {part.type}
                        <pre className=" bg-black text-white p-2 mt-2 whitespace-pre-wrap break-words">
                          {JSON.stringify(part.input, null, 2)}
                        </pre>
                      </LogContainer>
                    );
                  case "step-start":
                    return <LogContainer>{part.type}</LogContainer>;
                  case "source-url":
                    return (
                      <LogContainer>
                        {part.type} :{part.url}
                      </LogContainer>
                    );
                  case "reasoning":
                    return (
                      <LogContainer>
                        type:{part.type}, state:{part.state}
                      </LogContainer>
                    );
                  case "dynamic-tool":
                    return (
                      <LogContainer>
                        type:{part.type}, tool:{part.toolName}, state:
                        {part.state}
                      </LogContainer>
                    );
                  case "source-document":
                    return (
                      <LogContainer>
                        type:{part.type}, file-name:
                        {part.filename} media-type:${part.mediaType}
                      </LogContainer>
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

const LogContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="border border-gray-400 rounded p-2 mt-2 relative text-white text-sm bg-gray-400">
      <span className="bg-gray-400 text-white absolute right-[calc(100%+0.2rem)] h-max w-max py-2 px-3 border border-gray-400 top-[-1px] rounded">
        LOG :
      </span>{" "}
      {children}
    </p>
  );
};
