import { Toast } from "../components/toast.js";

export class ErrorHandler {
  static handle(error, userFriendlyMessage = "An unexpected error occurred.") {
    console.error("[Vocalis Error]:", error);

    let message = userFriendlyMessage;
    if (typeof error === "string") {
      message = error;
    } else if (error && error.message) {
      message = error.message;
    }

    Toast.error(message);
  }
}
