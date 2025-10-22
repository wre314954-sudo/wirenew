import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Inquiry", to: "/inquiry" },
  { label: "My Orders", to: "/orders" },
  { label: "Owner Dashboard", to: "/owner" },
  { label: "About Us", to: "/about-us" },
  { label: "Return & Shipping", to: "/return-shipping-policy" },
] as const;

const SiteHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { isAuthenticated } = useUserAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-12 md:h-16 items-center justify-between gap-3 md:gap-6 px-3 md:px-4">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 grid gap-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                          isActive ? "text-primary" : "text-foreground",
                        )
                      }
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-4 space-y-2">
                  {!isAuthenticated ? (
                    <>
                      <Button asChild className="w-full" onClick={() => setIsMenuOpen(false)}>
                        <Link to="/signin">Sign In</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full" onClick={() => setIsMenuOpen(false)}>
                        <Link to="/signup">Sign Up</Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild variant="outline" className="w-full" onClick={() => setIsMenuOpen(false)}>
                      <Link to="/profile">My Profile</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link to="/" className="flex items-center gap-2 text-base md:text-lg font-semibold">
            <img src="/WireBazaar.jpg" alt="WireBazaar" className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover" />
            <span>WireBazaar</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {!isAuthenticated ? (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="whitespace-nowrap">
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="whitespace-nowrap">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        ) : (
          <Button asChild size="sm" variant="outline" className="whitespace-nowrap">
            <Link to="/profile">My Profile</Link>
          </Button>
        )}
      </div>
      <div aria-hidden="true" className="h-px bg-foreground/50" />
    </header>
  );
};

export default SiteHeader;
