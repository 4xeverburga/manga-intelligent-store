export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#1e2c31] bg-[#02090a]">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-8 text-sm text-[#a1a1aa] md:px-8 lg:px-16">
        <p>&copy; {new Date().getFullYear()} Hablemos Manga</p>
        <p>
          Developed by {" "}
          <span className="font-medium text-neon">4xeverburga</span> +{" "}
          <span className="font-medium text-white">a healthy amount of vibes</span>
        </p>
      </div>
    </footer>
  );
}
