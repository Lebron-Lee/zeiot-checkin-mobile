import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Checkin from "./pages/Checkin";
import Schedule from "./pages/Schedule";
import Awards from "./pages/Awards";
import Quiz from "./pages/Quiz";
import WishCard from "./pages/WishCard";
import Profile from "./pages/Profile";
import BigScreen from "./pages/BigScreen";
import Admin from "./pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/checkin" component={Checkin} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/awards" component={Awards} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/wish" component={WishCard} />
      <Route path="/profile" component={Profile} />
      <Route path="/bigscreen" component={BigScreen} />
      <Route path="/admin" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
