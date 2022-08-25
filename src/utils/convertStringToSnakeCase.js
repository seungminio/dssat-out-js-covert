export default (string) => {
  return string
    .trimStart()
    .trimEnd()
    .replace(/[(),\s]/g, "_")
    .replace(/[!.]/g, "");
};
