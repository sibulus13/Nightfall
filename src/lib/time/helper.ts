
export const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
};

// If the new date is today, display "Today" instead of the date
export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.getDate() === today.getDate()) {
        return "Today";
    } else {
        return date.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    }
};