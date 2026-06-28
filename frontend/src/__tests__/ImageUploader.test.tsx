import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageUploader } from "@/components/ImageUploader";

function makeJpeg(name = "photo.jpg", sizeBytes = 1024): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type: "image/jpeg" });
  return new File([blob], name, { type: "image/jpeg" });
}

describe("ImageUploader", () => {
  it("renders the upload zone with accessible role", () => {
    render(<ImageUploader onFileSelected={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /image upload/i }),
    ).toBeInTheDocument();
  });

  it("calls onFileSelected with the chosen file", async () => {
    const onFileSelected = vi.fn();
    render(<ImageUploader onFileSelected={onFileSelected} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeJpeg();

    await userEvent.upload(input, file);

    expect(onFileSelected).toHaveBeenCalledOnce();
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows a validation error for an unsupported file type", () => {
    render(<ImageUploader onFileSelected={vi.fn()} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const gif = new File([new Uint8Array(100)], "anim.gif", {
      type: "image/gif",
    });

    // userEvent.upload respects the `accept` attr in jsdom so the onChange never
    // fires for disallowed types. Use fireEvent.change to exercise our validation.
    Object.defineProperty(input, "files", { value: [gif], configurable: true });
    fireEvent.change(input);

    expect(screen.getByRole("alert")).toHaveTextContent(/unsupported/i);
  });

  it("shows a validation error for an oversized file", async () => {
    render(<ImageUploader onFileSelected={vi.fn()} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const bigFile = makeJpeg("big.jpg", 11 * 1024 * 1024);

    await userEvent.upload(input, bigFile);

    expect(await screen.findByRole("alert")).toHaveTextContent(/maximum/i);
  });

  it("is disabled when isDisabled=true", () => {
    render(<ImageUploader onFileSelected={vi.fn()} isDisabled />);
    const zone = screen.getByRole("button", { name: /image upload/i });
    expect(zone).toHaveAttribute("aria-disabled", "true");
  });

  it("opens file picker on Enter key press", async () => {
    render(<ImageUploader onFileSelected={vi.fn()} />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});

    const zone = screen.getByRole("button", { name: /image upload/i });
    await userEvent.type(zone, "{Enter}");

    expect(clickSpy).toHaveBeenCalled();
  });
});
