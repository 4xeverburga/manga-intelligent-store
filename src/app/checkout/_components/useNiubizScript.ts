"use client";

import { useEffect, useState } from "react";

const SCRIPT_ID = "niubiz-checkout-script";
const SCRIPT_SRC = "https://static-content-qas.vnforapps.com/v2/js/checkout.js";

export function useNiubizScript() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);

  return loaded;
}
