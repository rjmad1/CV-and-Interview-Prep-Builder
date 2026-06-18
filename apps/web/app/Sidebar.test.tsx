import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Sidebar from "./Sidebar";

describe("Sidebar component", () => {
  it("renders the sidebar brand and links", () => {
    render(<Sidebar />);
    
    // Check that Brand is rendered
    expect(screen.getAllByText("Studio")[0]).toBeInTheDocument();
    
    // Check that main link categories are present
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Documents/i)).toBeInTheDocument();
    expect(screen.getByText(/Job Description Analyzer/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock Interviews/i)).toBeInTheDocument();
  });
});
