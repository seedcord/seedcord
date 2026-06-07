import { redirect } from 'next/navigation';

// visitors go straight to the default package's overview
export default function DocsIndexPage(): never {
    redirect('/packages/seedcord/latest');
}
