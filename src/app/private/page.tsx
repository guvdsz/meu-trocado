import { auth } from "@clerk/nextjs/server";

export default async function Private() {
    await auth.protect();

    return <h1>Private</h1>;
}
