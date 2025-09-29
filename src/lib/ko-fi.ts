export const KOFI_SUPPORT_URL = "https://ko-fi.com/cassettetech";
export const KOFI_ICON_SRC = "https://storage.ko-fi.com/cdn/logomarkLogo.png";

export const openKoFiSupport = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.open(KOFI_SUPPORT_URL, "_blank", "noopener,noreferrer");
};
