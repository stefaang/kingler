"""Add date_created, color and icon to Racer class

Revision ID: 96fa83f3cc80
Revises: 4cc8222323cd
Create Date: 2016-10-03 08:30:39.451404

"""

# revision identifiers, used by Alembic.
revision = '96fa83f3cc80'
down_revision = '4cc8222323cd'

from alembic import op
import sqlalchemy as sa
import geoalchemy2


def upgrade():
    with op.batch_alter_table("racer") as batch_op:
        batch_op.add_column(sa.Column('date_created', sa.DateTime))
        batch_op.add_column(sa.Column('color', sa.String))
        batch_op.add_column(sa.Column('icon', sa.String))


def downgrade():
    with op.batch_alter_table("racer") as batch_op:
        batch_op.drop_column('date_created')
        batch_op.drop_column('color')
        batch_op.drop_column('icon')
