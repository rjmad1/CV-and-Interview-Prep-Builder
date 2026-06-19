import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FeedbackWidget from "./FeedbackWidget";

// Mock the global fetch
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: "mock-id", status: "success" })
  })
);
global.window.fetch = mockFetch;

describe("FeedbackWidget component", () => {
  it("renders the floating button initially", () => {
    render(<FeedbackWidget />);
    // Check that button is rendered but form is not
    expect(screen.getByRole("button", { name: /Submit developer feedback/i })).toBeInTheDocument();
    expect(screen.queryByText("Issue Title / Request Summary *")).not.toBeInTheDocument();
  });

  it("opens the feedback form when floating button is clicked", () => {
    render(<FeedbackWidget />);
    const button = screen.getByRole("button", { name: /Submit developer feedback/i });
    fireEvent.click(button);

    // Form should be visible
    expect(screen.getByText("Issue Title / Request Summary *")).toBeInTheDocument();
    expect(screen.getByText("Detailed Description *")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit to AI Orchestrator/i })).toBeInTheDocument();
  });

  it("allows filling and submitting the feedback form", async () => {
    render(<FeedbackWidget />);
    const button = screen.getByRole("button", { name: /Submit developer feedback/i });
    fireEvent.click(button);

    // Fill fields
    const titleInput = screen.getByPlaceholderText(/e.g. Remove hardcoded JWT secret/i);
    const descInput = screen.getByPlaceholderText(/Provide context, reproduction steps, or expected behaviors.../i);
    
    fireEvent.change(titleInput, { target: { value: "Test Bug Title" } });
    fireEvent.change(descInput, { target: { value: "Test description of the bug." } });
    
    const submitBtn = screen.getByRole("button", { name: /Submit to AI Orchestrator/i });
    fireEvent.click(submitBtn);

    // Wait and check if loading or success page is rendered
    expect(mockFetch).toHaveBeenCalled();
  });
});
