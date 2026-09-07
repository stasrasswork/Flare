import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("submits entered credentials", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm error={null} loading={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("user@example.com", "secret"));
  });

  it("shows API errors", () => {
    render(<LoginForm error="Invalid credentials" loading={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
  });
});
