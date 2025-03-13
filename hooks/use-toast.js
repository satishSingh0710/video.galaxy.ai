// A simple toast hook implementation
// In a real app, you would use a proper toast library like react-hot-toast or react-toastify

import { useState } from "react";

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const toast = ({ title, description, variant = "default" }) => {
    console.log(`Toast: ${title} - ${description} (${variant})`);
    // In a real implementation, this would add the toast to a state array
    // and render it in a toast container
    
    // For now, we'll just use alert for simplicity
    alert(`${title}\n${description}`);
  };

  return { toast };
}; 