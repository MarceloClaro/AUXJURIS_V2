// Utility function to trigger file download in the browser
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  const dataUrl = URL.createObjectURL(blob);
  link.setAttribute("href", dataUrl);
  link.setAttribute("download", filename);
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(dataUrl); // Clean up the object URL
  console.log(`Downloaded ${filename}`);
};

// Other utility functions can be added here.