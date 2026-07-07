rootButton.addEventListener("click", async () => {
  const res = await fetch("/audio-library/api/root/select", {
    method: "POST",
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error ?? "Failed to select root");
    return;
  }

  await loadAudioList();
});