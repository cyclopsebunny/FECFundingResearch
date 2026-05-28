"use client";

export function PrintButton() {
  return (
    <button className="secondary-button" onClick={() => window.print()} type="button">
      Save report as PDF
    </button>
  );
}

