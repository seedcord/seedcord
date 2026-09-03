import { CustomId } from '#src/CustomId';

const Board = new CustomId('board').int('page', 0, 999).snowflake('roleId', { nullable: true });
type BoardParams = ReturnType<typeof Board.decode>;

const absent: BoardParams['roleId'] = null;
const present: BoardParams['roleId'] = '123';
void absent;
void present;

// @ts-expect-error page took no options and stays a plain number
const pageIsNotNullable: BoardParams['page'] = null;
void pageIsNotNullable;

const Note = new CustomId('note').str('body', { nullable: true });
type NoteParams = ReturnType<typeof Note.decode>;

const emptyBody: NoteParams['body'] = null;
void emptyBody;

Note.encode({ body: null });

const Plain = new CustomId('plain').snowflake('userId');
type PlainParams = ReturnType<typeof Plain.decode>;

// @ts-expect-error a field with no options stays non-null
const plainIsNotNullable: PlainParams['userId'] = null;
void plainIsNotNullable;

const Explicit = new CustomId('explicit').bool('silent', { nullable: false });
type ExplicitParams = ReturnType<typeof Explicit.decode>;

// @ts-expect-error nullable false reads the same as leaving it out
const explicitIsNotNullable: ExplicitParams['silent'] = null;
void explicitIsNotNullable;

Explicit.encode({ silent: true });

// encode takes the same widening the decode side gets
Board.encode({ page: 0, roleId: null });
Plain.encode({
    // @ts-expect-error null reaches encode only on a nullable field
    userId: null
});
