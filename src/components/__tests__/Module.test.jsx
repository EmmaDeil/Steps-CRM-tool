/* eslint-env jest */
/* global describe test expect */
import React from "react";
import { render, screen } from "@testing-library/react";
import Module from "../Module";

describe("Module filtering", () => {
  test("shows all modules when searchQuery is empty", () => {
    render(<Module searchQuery="" />);
    expect(screen.getByText(/Accounting/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/HR Management/i)).toBeInTheDocument();
  });

  test("filters modules by searchQuery", () => {
    render(<Module searchQuery="acc" />);
    expect(screen.getByText(/Accounting/i)).toBeInTheDocument();
    // Inventory should not be present
    const inv = screen.queryByText(/Inventory/i);
    expect(inv).toBeNull();
  });

  test("shows no results message for non-matching query", () => {
    render(<Module searchQuery="nope" />);
    expect(
      screen.getByText(/No modules matched your search\./i)
    ).toBeInTheDocument();
  });
});
