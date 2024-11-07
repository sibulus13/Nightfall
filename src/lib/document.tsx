export const scrollIntoTheView = (id: string) => {
  const element = document.getElementById(id)!;
  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
};
