"""empty message

Revision ID: 7a983b737285
Revises: 66c2b439ab31
Create Date: 2016-09-27 17:29:08.736782

"""

# revision identifiers, used by Alembic.
revision = '7a983b737285'
down_revision = '66c2b439ab31'

from alembic import op
import sqlalchemy as sa
import geoalchemy2


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('idx_position_pos', table_name='position')
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.create_index('idx_position_pos', 'position', ['pos'], unique=False)
    ### end Alembic commands ###
