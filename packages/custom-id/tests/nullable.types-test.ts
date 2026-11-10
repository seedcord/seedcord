import { CustomId } from '#src/CustomId';

const Board = new CustomId('board').int('page', 0, 999).snowflake('roleId', { nullable: true });
type BoardParams = ReturnType<typeof Board.decode>;

const absent: BoardParams['roleId'] = null;
const present: BoardParams['roleId'] = '123';
void absent;
void present;

// @ts-expect-error page was declared without options, so it's a plain number
const pageIsNotNullable: BoardParams['page'] = null;
void pageIsNotNullable;

const Note = new CustomId('note').str('body', { nullable: true });
type NoteParams = ReturnType<typeof Note.decode>;

const emptyBody: NoteParams['body'] = null;
void emptyBody;

Note.encode({ body: null });

const Plain = new CustomId('plain').snowflake('userId');
type PlainParams = ReturnType<typeof Plain.decode>;

// @ts-expect-error a field without options can't be null
const plainIsNotNullable: PlainParams['userId'] = null;
void plainIsNotNullable;

const Explicit = new CustomId('explicit').bool('silent', { nullable: false });
type ExplicitParams = ReturnType<typeof Explicit.decode>;

// @ts-expect-error nullable false reads the same as leaving it out
const explicitIsNotNullable: ExplicitParams['silent'] = null;
void explicitIsNotNullable;

Explicit.encode({ silent: true });

// encode accepts null wherever decode can return it
Board.encode({ page: 0, roleId: null });
Plain.encode({
    // @ts-expect-error encode only accepts null on a nullable field
    userId: null
});

const Assign = new CustomId('assign').someOf('roles', ['reader', 'artist', 'vip']);
type AssignParams = ReturnType<typeof Assign.decode>;

const picked: AssignParams['roles'] = ['reader', 'vip'];
void picked;

// @ts-expect-error someOf decodes to an array of the literal union
const unlisted: AssignParams['roles'] = ['admin'];
void unlisted;

// @ts-expect-error a someOf without options can't be null
const rolesAreNotNullable: AssignParams['roles'] = null;
void rolesAreNotNullable;

const Optional = new CustomId('optional').someOf('roles', ['reader', 'artist'], { nullable: true });
type OptionalParams = ReturnType<typeof Optional.decode>;

const noRoles: OptionalParams['roles'] = null;
void noRoles;

Optional.encode({ roles: null });

Assign.encode({
    // @ts-expect-error encode rejects an unlisted choice
    roles: ['admin']
});
