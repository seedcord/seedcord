import { redirect } from 'next/navigation';

export default function DocsIndexPage(): never {
    redirect('/packages/seedcord/latest');
}
