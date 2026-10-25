export default function Loader() {
    return (
        <div
            aria-label="Carregando login"
            className="flex min-h-[28rem] w-full items-center justify-center gap-2 text-sm text-teal-700"
            role="status"
        >
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />
        </div>
    );
}
