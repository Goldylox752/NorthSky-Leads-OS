fetch("/api/create-checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ plan: "starter" }),
})
  .then(res => res.json())
  .then(data => {
    window.location.href = data.url;
  });